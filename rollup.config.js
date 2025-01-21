import typescript from 'rollup-plugin-typescript2';
import path from 'path';

export default ['src/index.ts', 'src/utils.ts'].map((input) => ({
  input,
  plugins: [
    typescript({
      tsconfig: 'tsconfig.prod.json',
      tslib: path.resolve(__dirname, 'node_modules/tslib'), // Указываем путь к tslib
    }),
  ],
  external: ['allure-js-commons', 'rimraf', 'merge-anything', 'path', 'uuid', 'fs', 'strip-ansi'],
  output: {
    exports: 'auto', // Сохраняем auto, если экспорт должен быть автоматически определен
    dir: 'dist',
    format: 'cjs',  // Можно сменить на 'esm', если нужно
  },
}));
