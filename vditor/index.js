import Vditor from './src/index'
import defaultMarkdown from './default-markdown.md?raw'

const rootPath = window.location.origin

let toolbar = [
  'outline',
  'headings',
  'bold',
  'italic',
  'strike',
  'link',
  '|',
  'editor-theme-label',
  "editor-theme",
  '|',
  'list',
  'ordered-list',
  'check',
  'table',
  'outdent',
  'indent',
  '|',
  'quote',
  'line',
  'code',
  'inline-code',
  '|',
  'undo',
  'redo',
  '|',
  'settings',
  'help',
]

window.vditor = new Vditor('vditor', {
  cdn: rootPath,
  editorTheme: 'Light',
  codeMirrorTheme: 'Github',
  toolbar,
  mode: 'wysiwyg',
  height: document.querySelector('.demo-editor').clientHeight,
  cache: {
    enable: true,
  },
  value: defaultMarkdown,
  outline: {
    enable: true,
    position: 'left',
  },
  debugger: true,
  placeholder: 'Hello, Vditor!',
  toolbarConfig: {
    pin: true,
  },
  counter: {
    enable: true,
    type: 'text',
  },
  hint: {
    parse: false,
    extend: [
      {
        key: '@',
        hint: (key) => {
          if ('vanessa'.indexOf(key.toLocaleLowerCase()) > -1) {
            return [{
              value: '@Vanessa',
              html: '<img src="https://avatars0.githubusercontent.com/u/970828?s=60&v=4"/> Vanessa',
            }]
          }
          return []
        },
      },
      {
        key: '#',
        hint: (key) => {
          if ('vditor'.indexOf(key.toLocaleLowerCase()) > -1) {
            return [{
              value: '#Vditor',
              html: '<span style="color: #999;">#Vditor</span> ♏ 一款浏览器端的 Markdown 编辑器，支持所见即所得（富文本）、即时渲染（类似 Typora）。',
            }]
          }
          return []
        },
      },
    ],
  },
  tab: '\t',
  upload: {
    accept: 'image/*,.mp3, .wav, .rar',
    token: 'test',
    url: '/api/upload/editor',
    linkToImgUrl: '/api/upload/fetch',
    filename(name) {
      return name.replace(/[^(a-zA-Z0-9\u4e00-\u9fa5\.)]/g, '').
        replace(/[\?\\/:|<>\*\[\]\(\)\$%\{\}@~]/g, '').
        replace('/\\s/g', '')
    },
  },
})
