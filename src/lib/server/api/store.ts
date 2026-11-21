/* What a tool reads and writes, over a PocketBase client or, in a test, over memory. The
   tools list whole collections and choose in memory: a map has hundreds of records, and the
   PocketBase filter language stays out of the tools. A batch is one transaction. */
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

export type Data = Record<string, unknown>;

export type BatchOp =
	| { op: 'create'; collection: string; data: Data }
	| { op: 'update'; collection: string; id: string; data: Data }
	| { op: 'delete'; collection: string; id: string };

export interface ListOptions {
	/** The fields to read, as PocketBase takes them (`id,slug`); all when absent. */
	fields?: string;
}

export interface Store {
	list<T extends RecordModel = RecordModel>(collection: string, options?: ListOptions): Promise<T[]>;
	/** The record, or null when there is none. */
	one<T extends RecordModel = RecordModel>(collection: string, id: string): Promise<T | null>;
	create<T extends RecordModel = RecordModel>(collection: string, data: Data): Promise<T>;
	update<T extends RecordModel = RecordModel>(collection: string, id: string, data: Data): Promise<T>;
	remove(collection: string, id: string): Promise<void>;
	/** Every operation, or none. */
	batch(ops: BatchOp[]): Promise<void>;
}

const notFound = (err: unknown) => (err as { status?: number }).status === 404;

export class PocketBaseStore implements Store {
	constructor(private readonly pb: PocketBase) {}

	list<T extends RecordModel>(collection: string, options: ListOptions = {}): Promise<T[]> {
		return this.pb.collection(collection).getFullList<T>({ sort: 'created,id', ...(options.fields ? { fields: options.fields } : {}) });
	}

	async one<T extends RecordModel>(collection: string, id: string): Promise<T | null> {
		try {
			return await this.pb.collection(collection).getOne<T>(id);
		} catch (err) {
			if (notFound(err)) return null;
			throw err;
		}
	}

	create<T extends RecordModel>(collection: string, data: Data): Promise<T> {
		return this.pb.collection(collection).create<T>(data);
	}

	update<T extends RecordModel>(collection: string, id: string, data: Data): Promise<T> {
		return this.pb.collection(collection).update<T>(id, data);
	}

	async remove(collection: string, id: string): Promise<void> {
		await this.pb.collection(collection).delete(id);
	}

	async batch(ops: BatchOp[]): Promise<void> {
		if (ops.length === 0) return;
		const batch = this.pb.createBatch();
		for (const op of ops) {
			const sub = batch.collection(op.collection);
			if (op.op === 'create') sub.create(op.data);
			else if (op.op === 'update') sub.update(op.id, op.data);
			else sub.delete(op.id);
		}
		await batch.send();
	}
}
