// a Channel is to an AsyncIterable...
//
// ... what a Subject is to a Streamable
// ... what a Deferred is to a Promise
//
// --> it's an AsyncIterable that can be controlled from the outside
export class Channel<T> implements AsyncIterable<T> {
  private readonly stream: ReadableStream<T>;
  private readonly controller: ReadableStreamDefaultController<T>;
  private closed = false;

  constructor() {
    let controller: ReadableStreamDefaultController<T>;
    this.stream = new ReadableStream<T>({
      start(c) {
        controller = c;
      },
    });

    // the start callback is guaranteed to be called
    // therefore controller will be assigned
    this.controller = controller!;
  }

  push(item: T) {
    if (this.closed) return;
    this.controller.enqueue(item);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.controller.close();
  }

  async *[Symbol.asyncIterator]() {
    const reader = this.stream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      yield value;
    }
  }
}
