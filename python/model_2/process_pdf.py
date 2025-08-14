# process_pdf.py — CPU-only, offline PDF recommender (selected-text query mode, normalized scoring).
# Writes a per-PDF "<name>_output.json" after each PDF, and a single "output.json" summary at the end.
# No persona/job/timestamp in outputs. Minimal console output (only errors + final summary).

import os
import re
import json
import argparse
from collections import Counter, defaultdict
import numpy as np
import pdfplumber
import torch
from torch import inference_mode
from sentence_transformers import SentenceTransformer, CrossEncoder, models

# --------------------------
# CPU threading & env hints
# --------------------------
os.environ.setdefault("OMP_NUM_THREADS", str(os.cpu_count() or 4))
os.environ.setdefault("MKL_NUM_THREADS", str(os.cpu_count() or 4))
try:
    torch.set_num_threads(os.cpu_count() or 4)
    torch.set_num_interop_threads(max(1, (os.cpu_count() or 4)//2))
except Exception:
    pass

# --------------------------
# Utilities
# --------------------------
def ensure_dir(d): os.makedirs(d, exist_ok=True)

def _to_jsonable(o):
    import numpy as _np
    if isinstance(o, _np.generic): return o.item()
    if isinstance(o, _np.ndarray): return o.tolist()
    if isinstance(o, dict): return {k: _to_jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [_to_jsonable(x) for x in o]
    return o

def atomic_write_json(data, path):
    ensure_dir(os.path.dirname(path))
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(_to_jsonable(data), f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)

def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def sanitize_filename(fname):
    return re.sub(r"[^0-9A-Za-z._-]", "_", fname)

def clean_output_dir(output_dir):
    if not os.path.isdir(output_dir): return
    for name in os.listdir(output_dir):
        p = os.path.join(output_dir, name)
        try:
            if os.path.isdir(p):
                import shutil; shutil.rmtree(p, ignore_errors=True)
            else:
                os.remove(p)
        except OSError:
            pass

def clean_text_for_output(text, max_chars=1500):
    if not text: return ""
    t = re.sub(r"\s+", " ", text).strip()
    if len(t) > max_chars:
        cut = t[:max_chars]
        last_dot = cut.rfind(". ")
        t = cut[: last_dot + 1] if last_dot > 50 else cut
    return t

def is_junk_line(line_text):
    text = (line_text or "").strip().lower()
    if re.search(r"^(page\s*\d+|version\s*[\d\.]+|\d+\s*of\s*\d+)", text) or \
       ("..." in text and len(text.split()) > 3) or \
       ("copyright" in text or "©" in text or "all rights reserved" in text) or \
       (text.isnumeric()):
        return True
    return False

def format_extracted_sections(ranked_chunks):
    return [{
        "document": c["document"],
        "section_title": c["title"],
        "importance_rank": i + 1,
        "page_number": c["page"]
    } for i, c in enumerate(ranked_chunks)]

def format_subsection_analysis(ranked_chunks):
    return [{
        "document": c["document"],
        "refined_text": clean_text_for_output(c.get("text", "")),
        "page_number": c["page"]
    } for c in ranked_chunks]

# --------------------------
# Tokenization / lexical coverage
# --------------------------
_STOP = {
    "the","a","an","to","of","and","or","for","on","in","by","with","be","is","are","was","were",
    "it","as","at","this","that","these","those","from","into","about","over","under","than",
    "we","you","they","he","she","i","not","but","if","then","so","can","may","might","should",
    "would","could","will","just","also","more","most","such","any","all","each","other"
}
def _tokens(s):
    return [t for t in re.findall(r"[A-Za-z0-9_]+", (s or "").lower())
            if t not in _STOP and len(t) > 2]

def lexical_coverage(qtext, dtext):
    q = set(_tokens(qtext)); d = set(_tokens(dtext))
    if not q or not d: return 0.0
    return len(q & d) / len(q)

# --------------------------
# PDF parsing & chunking
# --------------------------
def build_line_object(words, page):
    text = " ".join(w.get("text", "") for w in words)
    sizes = [w.get("size", 12.0) for w in words]
    names = [w.get("fontname", "") for w in words]
    return {
        "text": text,
        "page": page.page_number - 1,
        "top": words[0]["top"],
        "bottom": max(w["bottom"] for w in words),
        "font_size": float(np.mean(sizes)),
        "is_bold": any("bold" in (name or "").lower() for name in names),
        "word_count": len(words)
    }

def extract_lines_and_features(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        all_lines, font_sizes = [], []
        for page in pdf.pages:
            page_words = page.extract_words(extra_attrs=["size", "fontname", "bottom"])
            if not page_words: continue
            page_words = sorted(page_words, key=lambda w: (w["top"], w["x0"]))
            font_sizes.extend([w["size"] for w in page_words if w.get("size") is not None])

            current_line, current_top = [], page_words[0]["top"]
            for word in page_words:
                if abs(word["top"] - current_top) > 2:
                    if current_line: all_lines.append(build_line_object(current_line, page))
                    current_line, current_top = [word], word["top"]
                else:
                    current_line.append(word)
            if current_line: all_lines.append(build_line_object(current_line, page))

        for i, line in enumerate(all_lines):
            prev_line_bottom = all_lines[i - 1]["bottom"] if i > 0 and all_lines[i - 1]["page"] == line["page"] else 0
            line["gap_before"] = line["top"] - prev_line_bottom

        doc_stats = {"most_common_font_size": Counter(font_sizes).most_common(1)[0][0] if font_sizes else 12.0}
    return all_lines, doc_stats

def score_headings(lines, doc_stats):
    out, body = [], doc_stats.get("most_common_font_size", 12.0)
    for line in lines or []:
        if is_junk_line(line.get("text","")): continue
        score = 0
        if line["font_size"] > body * 1.15: score += 20
        if line["is_bold"]: score += 15
        if line.get("gap_before", 0) > line["font_size"] * 1.5: score += 15
        if line["word_count"] <= 12: score += 10
        if line["word_count"] > 20: score -= 15
        if score > 25:
            line["score"] = score; out.append(line)
    return out

def get_level_from_structure(text):
    t = (text or "").strip()
    if re.match(r"^\d+\.\d+\.\d+\.\d+(\s|\.)", t) or re.match(r"^[a-z]\.[a-z]\.[a-z]\.[a-z](\s|\.)", t): return "H4"
    if re.match(r"^\d+\.\d+\.\d+(\s|\.)", t) or re.match(r"^[a-z]\.[a-z]\.[a-z](\s|\.)", t): return "H3"
    if re.match(r"^\d+\.\d+(\s|\.)", t) or re.match(r"^[A-Z]\.\d+(\s|\.)", t): return "H2"
    if re.match(r"^(chapter|section|part)\s+[IVXLC\d]+", t, re.IGNORECASE) or re.match(r"^\d+\.\s", t) or re.match(r"^[A-Z]\.\s", t): return "H1"
    return None

def classify_and_build_outline(potential_headings, lines):
    if not potential_headings: return [], (lines[0]["text"] if lines else "No Title Found")
    title_candidates = sorted([h for h in potential_headings if h["page"] == 0 and h["top"] < 200], key=lambda x: x["top"])
    title_text, title_lines = "", []
    if title_candidates:
        primary = max(title_candidates, key=lambda x: x.get('score',0), default=None)
        if primary:
            title_lines.append(primary)
            for cand in title_candidates:
                if cand not in title_lines and abs(cand["top"] - title_lines[-1]["bottom"]) < 25:
                    title_lines.append(cand)
            title_lines.sort(key=lambda x: x["top"])
            title_text = " ".join(clean_text_for_output(l["text"]) for l in title_lines)

    title_texts = {l["text"] for l in title_lines}
    headings_to_classify = [h for h in potential_headings if h["text"] not in title_texts]
    outline, unclassified = [], []
    for h in headings_to_classify:
        lvl = get_level_from_structure(h["text"])
        (outline if lvl else unclassified).append({"level": lvl or "", "text": h["text"].strip(), "page": h["page"]})

    if unclassified:
        fallback = sorted(list(set((h["font_size"], "bold" if h.get("is_bold") else "reg") for h in potential_headings)), key=lambda x: x[0], reverse=True)
        level_map, h1_found = {}, any(o["level"] == "H1" for o in outline)
        if fallback and not h1_found: level_map[fallback[0]] = "H1"
        if len(fallback) > 1: level_map[fallback[1 if not h1_found else 0]] = "H2"
        for style in fallback[2 if not h1_found else 1:]: level_map[style] = "H3"
        for uh in unclassified:
            style = (next((ph["font_size"] for ph in potential_headings if ph["text"] == uh["text"]), 12.0),
                     "bold" if any(ph["text"] == uh["text"] and ph.get("is_bold") for ph in potential_headings) else "reg")
            outline.append({"level": level_map.get(style, "H3"), "text": uh["text"], "page": uh["page"]})

    line_positions = {line["text"]: i for i, line in enumerate(lines)}
    outline.sort(key=lambda x: (x["page"], line_positions.get(x["text"], 0)))
    return outline, title_text.strip()

def extract_pdf_text_chunks(pdf_path, max_pages_per_doc=None):
    lines, doc_stats = extract_lines_and_features(pdf_path)
    if not lines: return []
    if max_pages_per_doc is not None:
        lines = [l for l in lines if l["page"] <= max_pages_per_doc - 1]
    potential_headings = score_headings(lines, doc_stats)
    outline, _ = classify_and_build_outline(potential_headings, lines)
    chunks, line_map = [], {(l["page"], l["text"]): i for i, l in enumerate(lines)}
    sorted_outline = sorted(outline, key=lambda h: (h["page"], line_map.get((h["page"], h["text"]), float('inf'))))

    for i, heading in enumerate(sorted_outline):
        start_key = (heading["page"], heading["text"])
        if start_key not in line_map: continue
        start_index = line_map[start_key]
        end_index = len(lines)
        end_key = None
        if i + 1 < len(sorted_outline):
            next_heading = sorted_outline[i+1]
            end_key = (next_heading["page"], next_heading["text"])
            if end_key in line_map: end_index = line_map[end_key]

        content_lines, l_end = [], lines[line_map[end_key]]["top"] if end_key in line_map else None
        for l in lines[start_index + 1 : end_index]:
            if l_end is not None and l['page'] == sorted_outline[i+1]['page'] and l['top'] >= l_end:
                break
            if not is_junk_line(l['text']): content_lines.append(l['text'])
        content_text = "\n".join(content_lines).strip()
        chunks.append({"title": heading["text"], "text": content_text, "page": heading["page"]})
    return chunks

# --------------------------
# Fast preview for gating
# --------------------------
def quick_doc_preview_text(pdf_path, max_pages=2, max_chars=2000):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            lines = []
            for page in pdf.pages[:max_pages]:
                page_words = page.extract_words(extra_attrs=["size","fontname","bottom"])
                if not page_words: continue
                page_words = sorted(page_words, key=lambda w: (w["top"], w["x0"]))
                current_line, current_top = [], page_words[0]["top"]
                for word in page_words:
                    if abs(word["top"] - current_top) > 2:
                        if current_line: lines.append(" ".join(w.get("text","") for w in current_line))
                        current_line, current_top = [word], word["top"]
                    else:
                        current_line.append(word)
                if current_line: lines.append(" ".join(w.get("text","") for w in current_line))
        lines = [l for l in lines if not is_junk_line(l)]
        heads = [l for l in lines if len(l.split()) <= 12]
        blob = " ".join(heads[:40] + lines)
        return clean_text_for_output(blob, max_chars=max_chars)
    except Exception:
        return ""

# --------------------------
# Query enrichment helper (selected-text only)
# --------------------------
def enrich_query(input_data):
    q = ((input_data.get("query") or {}).get("selected_text") or "").strip()
    if not q:
        return ""
    q = re.sub(r"\s+", " ", q)
    return q

# --------------------------
# Embedding helpers (CPU)
# --------------------------
def _l2_normalize(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True) + 1e-12
    return mat / norms

def _encode_norm(model: SentenceTransformer, texts, batch_size=128) -> np.ndarray:
    with inference_mode():
        embs = model.encode(texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False)
    return _l2_normalize(embs.astype(np.float32))

def _predict_cross(cpu_cross: CrossEncoder, pairs, batch_size=64) -> np.ndarray:
    with inference_mode():
        scores = cpu_cross.predict(pairs, show_progress_bar=False, batch_size=batch_size)
    return np.asarray(scores, dtype=np.float32)

def _sigmoid(x):
    x = np.asarray(x, dtype=np.float32)
    return 1.0 / (1.0 + np.exp(-x))

# --------------------------
# Ranker (supports query-only or persona|task)
# --------------------------
class MultiQueryRanker:
    def __init__(self, model_dir, alpha=1.0, beta=0.35, gamma=0.25,
                 cross_top_m=48, quantize_int8=False):
        bge_model_path = os.path.join(model_dir, "bge-small-en-v1.5")
        word_embedding_model = models.Transformer(bge_model_path)
        pooling_model = models.Pooling(word_embedding_model.get_word_embedding_dimension())
        self.model = SentenceTransformer(modules=[word_embedding_model, pooling_model]).to("cpu").eval()

        if quantize_int8:
            try:
                from torch.ao.quantization import quantize_dynamic
                if hasattr(word_embedding_model, "auto_model") and word_embedding_model.auto_model is not None:
                    word_embedding_model.auto_model = quantize_dynamic(
                        word_embedding_model.auto_model, {torch.nn.Linear}, dtype=torch.qint8
                    ).eval()
            except Exception:
                pass

        cross_encoder_path = os.path.join(model_dir, "cross-encoder-ms-marco")
        self.cross_encoder = CrossEncoder(cross_encoder_path, device="cpu")
        if quantize_int8:
            try:
                from torch.ao.quantization import quantize_dynamic
                if hasattr(self.cross_encoder, "model"):
                    self.cross_encoder.model = quantize_dynamic(
                        self.cross_encoder.model, {torch.nn.Linear}, dtype=torch.qint8
                    ).eval()
            except Exception:
                pass

        self.alpha = float(alpha)
        self.beta  = float(beta)
        self.gamma = float(gamma)
        self.cross_top_m = int(cross_top_m)

    def build_anchor(self, persona=None, task=None, query=None):
        if query and str(query).strip():
            return str(query).strip()
        parts = [p for p in [persona, task] if p and str(p).strip()]
        return " | ".join(parts) if parts else ""

    def score_documents(self, doc_previews, anchor, batch_size=128):
        if not doc_previews: return []
        names = list(doc_previews.keys())
        previews = [doc_previews[n] for n in names]
        q_emb = _encode_norm(self.model, [anchor], batch_size=batch_size)  # [1,d]
        p_emb = _encode_norm(self.model, previews, batch_size=batch_size)  # [N,d]
        sims = p_emb @ q_emb.T
        return list(zip(names, sims.ravel().astype(np.float32)))

    def preselect_chunks_lexical(self, anchor, chunks, max_keep=200, min_cov=0.05):
        scored = []
        for c in chunks:
            text = c["text"] if c.get("text","").strip() else c.get("title","")
            cov = lexical_coverage(anchor, text)
            if cov >= min_cov:
                cc = dict(c); cc["_lex_cov_pre"] = float(cov); scored.append(cc)
        if not scored:
            for c in chunks:
                cov = lexical_coverage(anchor, c.get("title",""))
                if cov >= (min_cov * 0.5):
                    cc = dict(c); cc["_lex_cov_pre"] = float(cov); scored.append(cc)
        scored.sort(key=lambda x: x["_lex_cov_pre"], reverse=True)
        return scored[:max_keep] if scored else chunks[:max_keep]

    def rank(self, persona=None, task=None, chunks=None, query=None, top_k=5, max_chunks_per_doc=2,
             min_cross_score=None, min_final_score=None, batch_size=128, shortlist_multiplier=4):
        if not chunks: return []
        anchor = self.build_anchor(persona, task, query) or "related sections"

        anchor_len = len(_tokens(anchor))
        min_cov = 0.03 if anchor_len >= 8 else 0.01
        cross_top_m_local = self.cross_top_m if anchor_len >= 8 else max(self.cross_top_m, 64)

        chunks = self.preselect_chunks_lexical(anchor, chunks, max_keep=max(200, top_k*50), min_cov=min_cov)

        texts = [c["text"].strip() if c.get("text","").strip() else c.get("title","") for c in chunks]
        q_emb = _encode_norm(self.model, [anchor], batch_size=batch_size)
        c_emb = _encode_norm(self.model, texts, batch_size=batch_size)

        bi_sims = (c_emb @ q_emb.T).ravel()
        for i, ch in enumerate(chunks): ch["similarity"] = float(bi_sims[i])

        ranked_by_bi = sorted(chunks, key=lambda x: x["similarity"], reverse=True)

        # shortlist — lift per-doc cap when ranking a single PDF
        doc_counter, shortlist = defaultdict(int), []
        max_shortlist = max(cross_top_m_local, top_k * shortlist_multiplier)
        docs_in_pool = {c.get("document","") for c in ranked_by_bi}
        single_doc_mode = len(docs_in_pool) == 1
        per_doc_shortlist_cap = max_shortlist if single_doc_mode else max(3, max_chunks_per_doc * 3)

        for ch in ranked_by_bi:
            d = ch.get("document","")
            if doc_counter[d] < per_doc_shortlist_cap:
                shortlist.append(ch); doc_counter[d] += 1
            if len(shortlist) >= max_shortlist: break

        if not shortlist: return []

        # Cross-encoder scoring (normalize before combining)
        pairs = [(anchor, c["text"]) for c in shortlist]
        cross_scores = _predict_cross(self.cross_encoder, pairs, batch_size=max(16, batch_size//2))
        cross_raw = np.asarray(cross_scores, dtype=np.float32)
        cross_prob = _sigmoid(cross_raw)                   # [0..1]
        sim_vals  = np.asarray([c["similarity"] for c in shortlist], dtype=np.float32)
        sim_norm  = (sim_vals + 1.0) * 0.5                 # [-1,1] -> [0..1]

        alpha_w = 1.0 if anchor_len >= 8 else 1.2
        beta_w  = 0.35 if anchor_len >= 8 else 0.45
        gamma_w = 0.25 if anchor_len >= 8 else 0.15

        for i, c in enumerate(shortlist):
            c["cross_prob"] = float(cross_prob[i])
            c["sim_norm"]   = float(sim_norm[i])
            c["lex_cov"]    = float(lexical_coverage(anchor, c["text"]))
            c["final_score"] = alpha_w * c["cross_prob"] + beta_w * c["sim_norm"] + gamma_w * c["lex_cov"]

        filtered = [
            c for c in shortlist
            if (min_cross_score is None or c["cross_prob"] >= min_cross_score)
            and (min_final_score is None or c["final_score"] >= min_final_score)
        ]
        filtered.sort(key=lambda x: x["final_score"], reverse=True)

        per_doc, final = defaultdict(int), []
        for c in filtered:
            if per_doc[c["document"]] < max_chunks_per_doc:
                final.append(c); per_doc[c["document"]] += 1
            if len(final) >= top_k: break
        return final

# --------------------------
# Per-PDF processing (writes per-PDF file immediately)
# --------------------------
def process_single_pdf(pdf_path, file_name, ranker, persona, task, output_dir,
                       top_k=5, min_words=8,
                       min_cross_score=None, min_final_score=None,
                       max_chunks_per_doc=2, max_pages_per_doc=None, batch_size=128,
                       query=None):
    chunks = extract_pdf_text_chunks(pdf_path, max_pages_per_doc=max_pages_per_doc)
    if not chunks:
        return None

    for c in chunks: c["document"] = file_name

    ranked = ranker.rank(
        persona, task, chunks,
        query=query,
        top_k=top_k,
        max_chunks_per_doc=max_chunks_per_doc,
        min_cross_score=min_cross_score,
        min_final_score=min_final_score,
        batch_size=batch_size
    )
    if not ranked:
        return None

    cleaned = []
    for c in ranked:
        refined = clean_text_for_output(c.get("text",""), max_chars=1500)
        if len(refined.split()) < min_words:
            fallback = clean_text_for_output(c.get("title",""))
            if len(fallback.split()) >= min_words:
                c["text"] = fallback; cleaned.append(c)
        else:
            c["text"] = refined; cleaned.append(c)
    if not cleaned:
        return None

    per_pdf_result = {
        "metadata": {
            "source_file": file_name,
            "query": query or ""
        },
        "extracted_sections": format_extracted_sections(cleaned),
        "subsection_analysis": format_subsection_analysis(cleaned)
    }

    out_name = sanitize_filename(os.path.splitext(file_name)[0]) + "_output.json"
    out_path = os.path.join(output_dir, out_name)
    atomic_write_json(per_pdf_result, out_path)
    return per_pdf_result

# --------------------------
# Main
# --------------------------
def matches_any_pattern(name, patterns):
    return any(re.search(p, name, flags=re.IGNORECASE) for p in patterns)

def get_page_count_safe(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf: return len(pdf.pages)
    except Exception: return float('inf')

def main(input_dir, output_dir, model_dir,
         top_k=5, per_doc_k=2,
         min_cross_score=None, min_final_score=None, min_words=8,
         alpha=1.0, beta=0.35, gamma=0.25, cross_top_m=48,
         max_docs=None, doc_threshold=None,
         allow_docs=None, deny_docs=None,
         preview_pages=2, max_pages_per_doc=None,
         batch_size=128, quantize_int8=False):
    input_json_path = os.path.join(input_dir, "input.json")
    pdfs_dir = os.path.join(input_dir, "PDFs")
    ensure_dir(output_dir)
    clean_output_dir(output_dir)

    if not os.path.exists(input_json_path):
        print(f"❌ Error: 'input.json' not found in '{input_dir}'."); return
    if not os.path.isdir(pdfs_dir):
        print(f"❌ Error: 'PDFs' directory not found in '{input_dir}'."); return

    try:
        input_data = read_json(input_json_path)
        persona = input_data.get("persona", {}).get("role", "user")
        task    = input_data.get("job_to_be_done", {}).get("task", "summarize")
        enriched_query = enrich_query(input_data)

        ranker = MultiQueryRanker(
            model_dir=model_dir,
            alpha=alpha, beta=beta, gamma=gamma, cross_top_m=cross_top_m,
            quantize_int8=quantize_int8
        )
    except Exception as e:
        print(f"❌ Error during initialization: {e}")
        return

    pdf_files = [f for f in os.listdir(pdfs_dir) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print("-> Skipping: No PDF files found in the 'PDFs' directory."); return

    # Filters
    filters = input_data.get("filters", {})
    if allow_docs is None: allow_docs = filters.get("allow_docs", None)
    if deny_docs  is None: deny_docs  = filters.get("deny_docs",  None)
    allow_docs = [] if allow_docs is None else (allow_docs if isinstance(allow_docs, list) else [allow_docs])
    deny_docs  = [] if deny_docs  is None else (deny_docs  if isinstance(deny_docs,  list) else [deny_docs])

    filtered_pdf_files = []
    for f in pdf_files:
        allow_ok = True if not allow_docs else matches_any_pattern(f, allow_docs)
        deny_block = matches_any_pattern(f, deny_docs) if deny_docs else False
        if allow_ok and not deny_block:
            filtered_pdf_files.append(f)
    if not filtered_pdf_files:
        return

    # Order: shortest first
    filtered_pdf_files.sort(key=lambda f: get_page_count_safe(os.path.join(pdfs_dir, f)))

    # Gating previews
    doc_previews = {}
    for name in filtered_pdf_files:
        try:
            doc_previews[name] = quick_doc_preview_text(os.path.join(pdfs_dir, name), max_pages=preview_pages)
        except Exception:
            doc_previews[name] = ""

    # Build anchor for gating
    anchor = ranker.build_anchor(persona, task, enriched_query)
    doc_scores_list = ranker.score_documents(doc_previews, anchor, batch_size=batch_size)

    # Select docs by score (and thresholds)
    selected_docs = []
    if doc_scores_list:
        doc_scores_list.sort(key=lambda x: x[1], reverse=True)
        for name, score in doc_scores_list:
            if (doc_threshold is not None) and (score < float(doc_threshold)): continue
            selected_docs.append(name)
            if max_docs is not None and len(selected_docs) >= int(max_docs): break
        if not selected_docs:
            take = min(len(doc_scores_list), max_docs or 3)
            selected_docs = [name for name, _ in doc_scores_list[:take]]
    else:
        selected_docs = filtered_pdf_files[: (max_docs or len(filtered_pdf_files))]

    # Process PDFs one by one, writing each per-PDF file immediately
    processed_meta = []
    skipped = []
    for fname in selected_docs:
        try:
            res = process_single_pdf(
                os.path.join(pdfs_dir, fname), fname, ranker, persona, task, output_dir,
                top_k=top_k,
                min_words=min_words,
                min_cross_score=min_cross_score,
                min_final_score=min_final_score,
                max_chunks_per_doc=per_doc_k,
                max_pages_per_doc=max_pages_per_doc,
                batch_size=batch_size,
                query=enriched_query
            )
            if res:
                processed_meta.append({
                    "file": fname,
                    "output": os.path.basename(sanitize_filename(os.path.splitext(fname)[0]) + "_output.json")
                })
            else:
                skipped.append({"file": fname})
        except Exception as e:
            skipped.append({"file": fname, "error": str(e)})

    # Final summary (one file) — metadata only includes input_documents + query
    final_summary = {
        "metadata": {
            "input_documents": selected_docs,
            "query": enriched_query
        },
        "doc_scores": [{"file": n, "score": float(s)} for (n, s) in (doc_scores_list or [])],
        "summary": {
            "processed": processed_meta,
            "skipped": skipped
        }
    }
    overall_output_path = os.path.join(output_dir, "output.json")
    atomic_write_json(final_summary, overall_output_path)
    print(f"✅ Done. Summary written to: {overall_output_path}")
    # ⬇️ ADD THIS LINE:
    print(f"SAVED_DIR::{output_dir}", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CPU-only, offline PDF recommender — per-PDF outputs + final summary.")
    parser.add_argument("input_dir", help="Directory containing 'input.json' and the 'PDFs' folder.")
    parser.add_argument("output_dir", help="Directory where outputs and summary will be saved.")
    parser.add_argument("model_dir", help="Directory containing local model folders.")
    parser.add_argument("--top_k", type=int, default=5, help="How many top sections to return per selected PDF.")
    parser.add_argument("--per_doc_k", type=int, default=2, help="Max selections per document.")
    parser.add_argument("--min_cross_score", type=float, default=None, help="Minimum cross-encoder probability (0..1).")
    parser.add_argument("--min_final_score", type=float, default=None, help="Minimum final (hybrid) score.")
    parser.add_argument("--min_words", type=int, default=8, help="Minimum words in refined text.")
    parser.add_argument("--alpha", type=float, default=1.0, help="Weight for cross-encoder probability.")
    parser.add_argument("--beta", type=float, default=0.35, help="Weight for bi-encoder similarity (normalized).")
    parser.add_argument("--gamma", type=float, default=0.25, help="Weight for lexical coverage.")
    parser.add_argument("--cross_top_m", type=int, default=48, help="Shortlist size to re-rank with cross-encoder.")
    parser.add_argument("--max_docs", type=int, default=3, help="Max PDFs to process after gating.")
    parser.add_argument("--doc_threshold", type=float, default=None, help="Minimum doc-level similarity to include.")
    parser.add_argument("--allow_docs", nargs="*", default=None, help="Regex patterns; only PDFs matching are allowed.")
    parser.add_argument("--deny_docs", nargs="*", default=None, help="Regex patterns; PDFs matching are excluded.")
    parser.add_argument("--preview_pages", type=int, default=2, help="Pages used for document preview gating.")
    parser.add_argument("--max_pages_per_doc", type=int, default=None, help="Hard cap on pages parsed per doc.")
    parser.add_argument("--batch_size", type=int, default=128, help="Encode batch size on CPU.")
    parser.add_argument("--quantize_int8", action="store_true", help="Dynamic INT8 quantization for speed (CPU).")

    args = parser.parse_args()

    main(
        args.input_dir,
        args.output_dir,
        args.model_dir,
        top_k=args.top_k,
        per_doc_k=args.per_doc_k,
        min_cross_score=args.min_cross_score,
        min_final_score=args.min_final_score,
        min_words=args.min_words,
        alpha=args.alpha, beta=args.beta, gamma=args.gamma,
        cross_top_m=args.cross_top_m,
        max_docs=args.max_docs,
        doc_threshold=args.doc_threshold,
        allow_docs=args.allow_docs,
        deny_docs=args.deny_docs,
        preview_pages=args.preview_pages,
        max_pages_per_doc=args.max_pages_per_doc,
        batch_size=args.batch_size,
        quantize_int8=args.quantize_int8
    )
