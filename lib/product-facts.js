import productFacts from '../data/product-facts.json' with { type: 'json' };

export const PRODUCT_FACTS = Object.freeze(productFacts);

export const PRODUCT_FACT_LABELS = Object.freeze(PRODUCT_FACTS.display);
