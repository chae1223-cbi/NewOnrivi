module.exports = {
  'frontend/src/**/*.{ts,tsx}': () => [
    `npm --prefix frontend run lint`,
    `npm --prefix frontend run typecheck`
  ]
};
