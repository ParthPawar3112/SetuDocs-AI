// Marathi dictionary = every chunk file in locales/mr (same chunk names as English).
const chunks = import.meta.glob("./locales/mr/*.js", { eager: true });

export default Object.assign({}, ...Object.values(chunks).map((chunk) => chunk.default));
