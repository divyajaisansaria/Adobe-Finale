type EventHandler = (data?: any) => void;

class EventBus {
  private events: { [key: string]: EventHandler[] } = {};

  subscribe(event: string, callback: EventHandler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  dispatch(event: string, data?: any) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

const eventBus = new EventBus();
export default eventBus;