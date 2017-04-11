/**
 * EQ Reporting
 * Base Class
 *
 * Base class for Mongo documents.
 */
 class Base {
 	constructor(attributes) {
 		this.attributes = attributes;
 		this.cachedRelations = {};
 		return new Proxy(this, {
 			get: this.get.bind(this),
 			set: this.set.bind(this)
 		});
 	}

 	get(obj, prop) {
 		if (this.attributes.hasOwnProperty(prop)) {
 			return this.attributes[prop];
 		} else {
 			return obj[prop];
 		}
 	}

 	set(obj, prop, newValue) {
 		if (this.attributes.hasOwnProperty(prop)) {
 			this.attributes[prop] = newValue;
 		} else {
 			obj[prop] = newValue;
 		}
 	}

 	get id() {
 		const { idField } = this.constructor;
 		return this.attributes[idField];
 	}

 	set id(newValue) {
 		const { idField } = this.constructor;
 		this.attributes[idField] = newValue;
 	}

 	save() {
 		const { collection, idField } = this.constructor;
 		if (!this.attributes._id) {
 			const promise = db.collection(collection).insertOne(this.attributes);
 			promise.then((saved) => {
 				this.attributes._id = saved.insertedId;
 			});
 			return promise;
 		}
 		return db.collection(collection).updateOne(
 			{ [idField]: this.attributes[idField] },
 			this.attributes,
 			{ upsert: true }
 		);
 	}

 	static generateId() {
 		const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const ID_LENGTH = 24;
 		var rtn = '';
		for (var i = 0; i < ID_LENGTH; i++) {
			rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
		}
		return rtn;
 	}

 	static find(query, options = {}) {
 		const Model = this;
 		return new Promise((resolve, reject) => {
 			db.collection(this.collection).find(query, options).toArray((err, docs) => {
 				if (!err) {
 					if (options.limit === -1) {
 						return docs.length == 0 ? resolve(null) : resolve(new Model(docs[0]));
 					}
 					return resolve(docs.map(doc => new Model(doc)));
 				}
 				reject(err);
 			});
 		});
 	}

 	static findOne(query, options = {}) {
 		return this.find(query, Object.assign(options, {limit: -1}));
 	}

 	static findOneById(id) {
 		return this.findOne({ [this.idField]: id });
 	}

 }

 module.exports = Base;