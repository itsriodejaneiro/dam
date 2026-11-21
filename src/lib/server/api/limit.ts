/* The requests of a token, counted in a sliding window in this process's memory: each
   deploy runs one app process, and a restart starts the count over. The clock comes in as
   a parameter, so a test moves it. */

export class SlidingWindow {
	readonly #hits = new Map<string, number[]>();
	#swept = 0;

	constructor(
		readonly limit: number,
		readonly windowMs: number
	) {}

	#live(key: string, now: number): number[] {
		const since = now - this.windowMs;
		const hits = (this.#hits.get(key) ?? []).filter((at) => at > since);
		if (hits.length) this.#hits.set(key, hits);
		else this.#hits.delete(key);
		return hits;
	}

	/** Counts one request; the milliseconds to wait when the key is over its limit, else 0. */
	take(key: string, now = Date.now()): number {
		this.#sweep(now);
		const hits = this.#live(key, now);
		if (hits.length >= this.limit) return hits[0] + this.windowMs - now;
		hits.push(now);
		this.#hits.set(key, hits);
		return 0;
	}

	/** Keys with nothing in the window go, at most once a window: a deleted token leaves no trace. */
	#sweep(now: number): void {
		if (now - this.#swept < this.windowMs) return;
		this.#swept = now;
		for (const key of [...this.#hits.keys()]) this.#live(key, now);
	}

	get size(): number {
		return this.#hits.size;
	}
}
