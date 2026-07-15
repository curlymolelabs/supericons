export const MATERIAL_GSTATIC_FALLBACKS = Object.freeze({
  auto_draw_solid: Object.freeze({
    outline: 'e8abac97223d4b08477e0ec0f2efb82680ae06d7a074612bf8c5599c37a40b4d',
    solid: '927a5aab31bc882dcc052d5e0e9b7a53e6205d858c2a5591472c72c6b4354ee1',
  }),
  drawing_recognition: Object.freeze({
    outline: 'fa6fc8753ac5a519b9a1f3803b3e7720d5237d3e6f2d17d3c5c45dc7acf3779e',
    solid: '052ec75e1d283cacdf83ee8e80f10993a1cfe3df51f0764f84e6c9126abc6a5b',
  }),
  do_disturb_alt: Object.freeze({
    outline: '88b2cbe4212fc8dd470223dfa2c48a3a76b30f4862851dd8bff7f71bc3850b9b',
    solid: '521916c5959e9932b7272e843b60056497f96876ecf49c6d8c65e42cd9767bd1',
  }),
  do_not_disturb: Object.freeze({
    outline: '88b2cbe4212fc8dd470223dfa2c48a3a76b30f4862851dd8bff7f71bc3850b9b',
    solid: '521916c5959e9932b7272e843b60056497f96876ecf49c6d8c65e42cd9767bd1',
  }),
  filter_list_alt: Object.freeze({
    outline: 'd05118c41e4aae8e000468924315661c30bbdb37409fdfebf54af8886aa51f12',
    solid: 'd74db1d2cbc297d0eb3af22c9490f2606f022138e5f651ffec3ac4f93de23914',
  }),
  handwriting_recognition: Object.freeze({
    outline: '90ffb21d5b9c18519275467dfa7434e1b91ef22d977e5c8ca95c08c13a3401b9',
    solid: '39f4479ff494310e39f7879ce15ceef90dc2a72a12cea7e032537f88be1fe3b1',
  }),
  rate_review_rtl: Object.freeze({
    outline: '9cd25959d9a6c5147ac6695ed5bcca64ad126e7bc5570516bc8e376bf9698035',
    solid: '98edbbba47b817d940668f33037f3859b55d072a49f124b8bfb342edcce98242',
  }),
  shape_recognition: Object.freeze({
    outline: '15d4a8760e1750b03ab595d11625ba181c2d613a019c67e6b625c091b4a8cdb9',
    solid: 'c15f34a9893ad8e8fa5074c81408dc6897f19de26b939c2ed6b5a586fffeb6a4',
  }),
  work_off: Object.freeze({
    outline: '7437b2f489f3aacf9f9e8c09c2f30b66745139aa34f23951d70d307798b50ab0',
    solid: '5afa9d493925f3e56f6aa66ebc77754f822bc29a622a8babc5ac2f91b15e7189',
  }),
});

export function buildMaterialGstaticFallbackUrl(iconId, variant) {
  const presetPath = variant === 'solid' ? 'fill1' : 'wght300';
  return `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${encodeURIComponent(iconId)}/${presetPath}/24px.svg`;
}
