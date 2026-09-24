import { authenticate, requirePermission } from '../../_lib/middleware.js';
import { translate } from './translate.js';

export const translateProduct = (context, fetchTranslation=fetch) => translate(context, fetchTranslation, 'product');
export const onRequestPost = [authenticate, requirePermission('product.edit'), context=>translateProduct(context)];
