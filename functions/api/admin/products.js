import { catalogHandlers } from '../../_lib/admin-catalog.js';
const handlers = catalogHandlers('product');
export const onRequestGet = handlers.get;
export const onRequestPost = handlers.post;
export const onRequestPut = handlers.put;
