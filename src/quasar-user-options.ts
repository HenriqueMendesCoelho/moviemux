import './styles/quasar.scss';
import '@quasar/extras/roboto-font/roboto-font.css';
import '@quasar/extras/material-icons/material-icons.css';
import { Loading, Notify, Dialog } from 'quasar';
import QuasarPtBr from 'quasar/lang/pt-BR';

// To be used on app.use(Quasar, { ... })
export default {
  config: {
    loading: {},
    notify: {},
    dialog: {},
  },
  plugins: {
    Loading,
    Notify,
    Dialog,
  },
  lang: QuasarPtBr,
};
