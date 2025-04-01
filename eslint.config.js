import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import stylistic from '@stylistic/eslint-plugin';

// 客製化推薦程式碼風格規則
// ref: https://github.com/eslint-stylistic/eslint-stylistic/blob/main/packages/eslint-plugin/configs/customize.ts
const stylisticCustomized = stylistic.configs.customize({
  semi: true,  // 陳述後加上分號
  jsx: false,  // 不引入jsx規則
});

export default [
  {
    ignores: [
      'dist',
      'tests/lib/**/*.js',
    ],
  },
  {
    plugins: {
      ...stylisticCustomized.plugins,
    },
    rules: {
      // 引用推薦的語法檢測規則
      // ref: https://eslint.org/docs/latest/rules/
      ...js.configs.recommended.rules,

      // 引用客製化推薦程式碼風格規則，及做一些微調
      // ref: https://eslint.style/rules
      ...stylisticCustomized.rules,
      "@stylistic/arrow-parens": "off",  // 取消強制箭頭函數加括號
      "@stylistic/brace-style": "off",  // 取消強制處理花括號前後換行
      "@stylistic/comma-dangle": "off",  // 取消強制多行物件尾部加逗點
      "@stylistic/eol-last": "off",  // 取消強制檔尾換行
      "@stylistic/indent": "off",  // 取消強制使用2空格縮排
      "@stylistic/indent-binary-ops": "off",  // 取消強制二元運算子縮排
      "@stylistic/max-statements-per-line": "off",  // 取消回報一行多陳述
      "@stylistic/multiline-ternary": "off",  // 取消強制三元運算子分行
      "@stylistic/no-mixed-operators": "off",  // 取消強制混合運算使用括號
      "@stylistic/no-multi-spaces": ["error", { ignoreEOLComments: true }],  // 禁止多重空格，但允許行尾註解前使用
      "@stylistic/no-multiple-empty-lines": ['error', { max: 2, maxBOF: 0, maxEOF: 0 }],  // 空行最多2個
      "@stylistic/object-curly-spacing": "off",  // 取消強制物件花括號內加空格
      "@stylistic/operator-linebreak": "off",  // 取消強制運算符號置於行首
      "@stylistic/quote-props": "off",  // 取消強制處理物件屬性的雙引號
      "@stylistic/quotes": "off",  // 取消強制字串使用雙引號
    },
  },
  {
    files: [
      'src/**/*.{js,jsx}',
      'public/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        chrome: false,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: [
      '*.js',
      'scripts/**/*.js',
      'tests/serve.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      'tests/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
      },
    },
  },
];
