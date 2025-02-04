"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Soul = void 0;
const koishi_1 = require("koishi");
const search_1 = require("./search");
const uuid_by_string_1 = __importDefault(require("uuid-by-string"));
const translate_1 = require("./translate");
class Soul {
    constructor() { }
    async init(config, context, parentName = '@tomlbz/openai') {
        const loggerName = parentName + '/soul';
        this._islog = config.isLog;
        this._logger = new koishi_1.Logger(loggerName);
        this._pineconeIndex = config.pineconeIndex;
        this._pineconeKey = config.pineconeKey;
        this._pineconeReg = config.pineconeReg;
        this._pineconeNamespace = config.pineconeNamespace;
        this._pineconeTopK = config.pineconeTopK;
        this._wolframAppId = config.wolframAppId;
        this._searchTopK = config.searchTopK;
        this._search = new search_1.Search();
        await this._search.init(config, context, loggerName);
        this._translate = new translate_1.Translate();
        await this._translate.init(config, context, loggerName);
        if (this._islog)
            this._logger.info(`Mem(${this._pineconeKey ? "Long+Cache" : "Cache-Only"}), TransL(${this._translate.mode}), Search(${this._search.mode})`);
        if (this._pineconeKey) { // key is key, env is reg
            const ctrlpath = `https://controller.${this._pineconeReg}.pinecone.io`;
            const whoami = `${ctrlpath}/actions/whoami`;
            try {
                const res = await context.http.get(whoami, { headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': this._pineconeKey
                    } });
                this._pineconeName = res.project_name;
                this._pineconeBaseUtl = `https://${this._pineconeIndex}-${this._pineconeName}.svc.${this._pineconeReg}.pinecone.io`;
                const desc = await this._describeIndex(context);
                if (!desc)
                    throw new Error('Pinecone failed to describe index');
                if (this._islog)
                    this._logger.info(`Pinecone: ${this._pineconeReg}/${this._pineconeIndex}, Dimension: ${desc}`);
            }
            catch (e) {
                this._logger.warn(e);
                this._logger.warn(`Pinecone failed, please check your API fields or the internet connection [${e}]`);
                return false;
            }
        }
        this.searchMode = this._search.mode;
        this.translateMode = this._translate.mode;
        return true;
    }
    async _describeIndex(context) {
        if (!this._pineconeKey)
            return ''; // no key, no pinecone
        const url = `https://controller.${this._pineconeReg}.pinecone.io/databases/${this._pineconeIndex}`;
        const res = await context.http.get(url, { headers: {
                'Api-Key': this._pineconeKey,
                'Content-Type': 'application/json'
            } });
        return res.database.dimension;
    }
    async remember(embeddings, metadata, context) {
        if (!this._pineconeKey)
            return; // no key, no pinecone
        const res = await context.http.post(`${this._pineconeBaseUtl}/vectors/upsert`, {
            vectors: [{
                    id: (0, uuid_by_string_1.default)(metadata.text, 5),
                    values: embeddings,
                    metadata: metadata,
                }],
        }, { headers: {
                'Api-Key': this._pineconeKey,
                'Content-Type': 'application/json'
        }
        });//现在，pinecone的免费版本不支持namespace
        if (this._islog) {
            if (typeof res.upsertedCount === 'number')
                this._logger.info(`Pinecone upserted ${res.upsertedCount} vectors`);
            else
                this._logger.info(`Pinecone had an unknown error while upserting vectors`);
        }
    }
    async recall(embeddings, keywords, context) {
        if (!this._pineconeKey)
            return []; // no key, no pinecone
        const data = {
            "topK": this.pineconeTopK,
            "includeValues": false,
            "includeMetadata": true,
            "vector": embeddings
        };//现在，pinecone的免费版本不支持namespace
        if (keywords && keywords.length > 0 && keywords!=null)
            data["filter"] = { keywords: { "$in": keywords } };
        this._logger.info(data["filter"])
        try {
            const res = await context.http.post(`${this._pineconeBaseUtl}/query`, data, { headers: {
                "Api-Key": this._pineconeKey,
                "Content-Type": 'application/json'
            } });
        return res.matches.map(match => match.metadata);
            }
        catch(e)
        {
            this._logger.info( e.response.data )
        }//避免因为recall导致机器人禁言
    }
    async _wolframCheckComputable(query, context) {
        const jsonstring = `http://www.wolframalpha.com/queryrecognizer/query.jsp?appid=DEMO&mode=Default&i=${encodeURIComponent(query)}&output=json`;
        try {
            const res = await context.http.get(jsonstring); // fetch(jsonstring)
            return res.query[0].accepted === 'true';
        }
        catch (e) {
            return false;
        }
    }
    async _wolframGetShortAnswer(query, context) {
        try {
            const url = `http://api.wolframalpha.com/v1/result?appid=${this._wolframAppId}&i=${encodeURIComponent(query)}&units=metric`;
            return await context.http.get(url); // await fetch(url)
        }
        catch (_) {
            this._logger.error('WolframAlpha Failed');
            return '';
        }
    }
    async compute(query, context) {
        if (this._wolframAppId) {
            const engquery = await this._translate.translate(query, 'en-US', context);
            if (await this._wolframCheckComputable(engquery, context)) {
                let engres = await this._wolframGetShortAnswer(engquery, context);
                engres = String(engres);
                if (!engres.includes('Wolfram|Alpha did not understand your input')) {
                    return await this._translate.translate(engres, 'zh-CN', context);
                }
            }
        }
        return '';
    }
    async search(query, context) {
        return await this._search.search(query, this._searchTopK, context);
    }
}
exports.Soul = Soul;
