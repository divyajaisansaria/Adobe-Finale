# 🚀 Connecting the Dots - Adobe India Hackathon 2025

## Theme: From Brains to Experience - Make It Real

### 1. How to Run Our Project

Our entire application is containerized using Docker for easy setup and deployment.

**Prerequisites:**
* [Docker](https://www.docker.com/get-started) installed on your machine.
* A folder containing your credentials file (e.g., `adbe-gcp.json`).

**Step 1: Build the Docker Image (Same for Mac and Windows)**

Clone the repository and build the Docker image using the following command in your terminal:

```bash
docker build --platform linux/amd64 -t adobe-website .
```

**Step 2: Run the Docker Container**

The `run` command differs slightly between operating systems due to the way file paths are handled.
The ADOBE API KEY used by us is:

```bash
ADOBE_EMBED_API_KEY=c00e026f37cc451aae1ee54adde2fca8
```
First, create a folder named `credentials` somewhere on your computer. Place your `adbe-gcp.json` - the google credentials file inside this folder.
Next, run the command below. You must replace `full/path/to/your/credentials` with the actual, full path to the credentials folder you just created.

#### For Windows (using Command Prompt)

```powershell
docker run `
  -v "/path/to/credentials:/credentials" `
  -e "ADOBE_EMBED_API_KEY=c00e026f37cc451aae1ee54adde2fca8" `
  -e "LLM_PROVIDER=gemini" `
  -e "GOOGLE_APPLICATION_CREDENTIALS=/credentials/adbe-gcp.json" `
  -e "GEMINI_MODEL=gemini-2.5-flash" `
  -e "TTS_PROVIDER=azure" `
  -e "AZURE_TTS_KEY=TTS_KEY" `
  -e "AZURE_TTS_ENDPOINT=TTS_ENDPOINT" `
  -p 8080:8080 `
  adobe-website
```
*Replace `/path/to/credentials` with the actual path to your credentials folder.*

#### For macOS / Linux

Use an absolute path for your credentials folder.

```bash
docker run -v "/path/to/your/credentials:/credentials" \
  -e ADOBE_EMBED_API_KEY=c00e026f37cc451aae1ee54adde2fca8 \
  -e LLM_PROVIDER=gemini \
  -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/adbe-gcp.json \
  -e GEMINI_MODEL=gemini-2.5-flash \
  -e TTS_PROVIDER=azure \
  -e AZURE_TTS_KEY=<YOUR_AZURE_TTS_KEY> \
  -e AZURE_TTS_ENDPOINT=<YOUR_AZURE_TTS_ENDPOINT> \
  -p 8080:8080 \
  adobe-website
```
*Replace `/path/to/your/credentials` with the actual absolute path to your credentials folder.*

Once the container is running, the application will be accessible at **[http://localhost:8080](http://localhost:8080)**.

#### Environment Variables

| Variable                       | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `ADOBE_EMBED_API_KEY`          | Your API key for the Adobe PDF Embed API.("c00e026f37cc451aae1ee54adde2fca8")                                  |
| `LLM_PROVIDER`                 | The LLM provider to use (e.g., `gemini`, `ollama`).                           |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path inside the container to your GCP credentials JSON file.                |
| `GEMINI_MODEL`                 | The specific Gemini model to use (e.g., `gemini-2.5-flash`).                  |
| `TTS_PROVIDER`                 | The Text-to-Speech provider (e.g., `azure`, `gcp`, `local`).                  |
| `AZURE_TTS_KEY`                | Your API key for Azure's TTS service.                                       |
| `AZURE_TTS_ENDPOINT`           | The endpoint URL for your Azure TTS resource.                               |

### 2. Introduction & Problem Statement

In today's information-rich world, professionals, students, and researchers are inundated with vast amounts of documents. Over time, it becomes incredibly difficult to recall specific details or, more importantly, to connect insights and ideas scattered across this personal library of knowledge. Our project, **Connecting the Dots**, transforms a static document collection into an interactive and intelligent knowledge base.

### 3. Our Solution: An Insight & Engagement System

We have built a web-based PDF reading experience that helps users connect the dots between documents they've read. When a user selects a piece of text, our system instantly surfaces related, overlapping, or even contradictory information from their entire document library. By leveraging AI, we go beyond simple search to provide contextual insights, enhancing comprehension and fostering new ideas—all grounded in the user's own content.

<!-- Add a GIF or screenshot of your application here -->
<img width="1710" height="984" alt="image" src="https://github.com/user-attachments/assets/507da336-e83e-40d6-9502-1ccfd0455af7" />
<img width="1710" height="980" alt="image" src="https://github.com/user-attachments/assets/c54c2d0d-2c8e-44d4-9594-d21cdd5b459b" />
<img width="1710" height="980" alt="image" src="https://github.com/user-attachments/assets/7f0883b1-c43a-42e9-9f68-c12e1e0b708c" />
<img width="1710" height="984" alt="image" src="https://github.com/user-attachments/assets/9d80cdb0-b098-4e90-ac9e-b48f47465f10" />
<img width="1710" height="981" alt="image" src="https://github.com/user-attachments/assets/608a8926-f9e0-4b7a-9d09-f79dd51a4b93" />


### 4. Core Features

* **Recommendation System and Heading Extraction**:
    * **Instantaneous Discovery**: Select any text to immediately see up to 6 relevant sections and snippets from other documents under the Relevant Section in Studio Panel.
    * **Seamless Navigation**: Click on a Headings to be taken directly to the page and section in the source PDF.
    * **High-Speed Performance**: A fast, responsive interface that surfaces insights without interrupting your reading flow.
* **PDF Handling & Display**:
    * **Bulk Upload**: Easily upload multiple PDFs to build your personal knowledge library.
    * **High-Fidelity Rendering**: View PDFs clearly with full support for zoom and pan, powered by the Adobe PDF Embed API.

### 5. Bonus Features

* **💡 Insights Bulb**:
    * Go beyond simple connections with AI-generated insights for your selected text, including key takeaways, contradictory viewpoints, relevant examples, and cross-document inspirations.
* **🎙️ Audio Overview / Podcast Mode**:
    * Generate a 2-5 minute, natural-sounding audio podcast or a single-speaker overview based on the selected text and related insights. Perfect for learning on the go!
* **💬 Ask Anything Chatbot**:
    * Engage in a conversation with your documents! An integrated chatbot that can answer any query about the content of the currently open PDF or even across your entire library.
* **📄 Full PDF Summary**:
    * Get a concise, AI-generated summary of the entire document, perfect for quickly grasping the main points.

### 6. Tech Stack

* **Frontend**:Next.js, Tailwind CSS, Adobe PDF Embed API (Dark/Light Mode)
* **Backend & AI**:
    * **API & Containerization**: Python, Docker
    * **Media Management**: Cloudinary,IndexedDB
    * **AI Models**: Heading Extraction (Model 1-A), Relevant Section Scoring (Model 1-B), CrossEncoder (ms-marco), bge-small-en-v1, Gemini 2.5 Flash, Microsoft Azure TTS

### 7. Team

<!-- List your team members here -->
* [Shashank Maurya](https://github.com/5hank6)
* [Divya Jaisansaria](https://github.com/divyajaisansaria)
* [Harshvardhan Gupta](https://github.com/harshvardhansgupta)

### 8. Live Demo 🌐
🔗 https://adobe-finale-production.up.railway.app
👉 **[Open the Live App](https://adobe-finale-production.up.railway.app)**



