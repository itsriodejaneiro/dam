/* The store over memory, for the tests of the tools: records by collection, ids given or
   drawn, a batch that applies whole or not at all. No rules and no indexes: those are
   PocketBase's, and e2e/security covers them. */
import type { RecordModel } from 'pocketbase';
import type { BatchOp, Data, ListOptions, Store } from './store';

export class MemoryStore implements Store {
	readonly data = new Map<string, Map<string, RecordModel>>();
	#clock = 0;

	/** A record as PocketBase would hold it, in a test's setup. */
	seed(collection: string, record: Data & { id: string }): RecordModel {
		const stamp = new Date(1_700_000_000_000 + this.#clock++ * 1000).toISOString();
		const row = { created: stamp, updated: stamp, collectionId: collection, collectionName: collection, ...record } as RecordModel;
		this.#table(collection).set(row.id, row);
		return row;
	}

	#table(collection: string): Map<string, RecordModel> {
		let table = this.data.get(collection);
		if (!table) this.data.set(collection, (table = new Map()));
		return table;
	}

	async list<T extends RecordModel>(collection: string, _options?: ListOptions): Promise<T[]> {
		return [...this.#table(collection).values()].sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id)) as T[];
	}

	async one<T extends RecordModel>(collection: string, id: string): Promise<T | null> {
		return (this.#table(collection).get(id) as T) ?? null;
	}

	async create<T extends RecordModel>(collection: string, data: Data): Promise<T> {
		const id = typeof data.id === 'string' && data.id ? data.id : Math.random().toString(36).slice(2, 17).padEnd(15, '0');
		if (this.#table(collection).has(id)) throw Object.assign(new Error('id taken'), { status: 400 });
		return this.seed(collection, { ...data, id }) as T;
	}

	async update<T extends RecordModel>(collection: string, id: string, data: Data): Promise<T> {
		const row = this.#table(collection).get(id);
		if (!row) throw Object.assign(new Error('not found'), { status: 404 });
		const next = { ...row, ...data, updated: new Date(1_700_000_000_000 + this.#clock++ * 1000).toISOString() } as RecordModel;
		this.#table(collection).set(id, next);
		return next as T;
	}

	async remove(collection: string, id: string): Promise<void> {
		if (!this.#table(collection).delete(id)) throw Object.assign(new Error('not found'), { status: 404 });
	}

	async batch(ops: BatchOp[]): Promise<void> {
		const snapshot = new Map([...this.data].map(([name, table]) => [name, new Map(table)]));
		try {
			for (const op of ops) {
				if (op.op === 'create') await this.create(op.collection, op.data);
				else if (op.op === 'update') await this.update(op.collection, op.id, op.data);
				else await this.remove(op.collection, op.id);
			}
		} catch (err) {
			this.data.clear();
			for (const [name, table] of snapshot) this.data.set(name, table);
			throw err;
		}
	}
}
