import typescript from 'rollup-plugin-typescript';
import sourceMaps from 'rollup-plugin-sourcemaps'

export default {
    input: './test.ts',
    output: {
        name: "test",
        file: "build/test.js",
        format: "cjs",
        sourcemap: true
    },
    plugins: [
      typescript(),
      sourceMaps(),
    ],
  };