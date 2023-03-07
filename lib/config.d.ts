import { Dict, Schema } from 'koishi';
export interface Config {
    apiKey: string;
    chatModel: string;
    keywordModel: string;
    codeModel: string;
    isLog: boolean;
    isDebug: boolean;
    isReplyWithAt: boolean;
    msgCooldown: number;
    nTokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
    pineconeKey: string;
    pineconeReg: string;
    pineconeIndex: string;
    pineconeNamespace: string;
    pineconeTopK: number;
    wolframAppId: string;
    botName: string;
    isNickname: boolean;
    botIdentity: string;
    sampleDialog: Dict<string, string>;
    randomReplyFrequency: number;
    cacheSize: number;
    cacheSaveInterval: number;
    cacheSaveDir: string;
    azureSearchKey: string;
    azureSearchRegion: string;
    searchTopK: number;
    azureTranslateKey: string;
    azureTranslateRegion: string;
}
export declare const Config: Schema<Config>;
