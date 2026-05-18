export default {
  // Other pages
  '/': false, // root is always false

  '/chat': true,

  // Page 404
  '/:pathMatch(.*)*': false,
};
