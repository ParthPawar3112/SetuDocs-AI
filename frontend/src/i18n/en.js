// English dictionary = every chunk file in locales/en (auto-merged; add a file to add strings).
const chunks = import.meta.glob("./locales/en/*.js", { eager: true });

export default Object.assign({}, ...Object.values(chunks).map((chunk) => chunk.default));
