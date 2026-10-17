// 1) Pega aquí la configuración de tu proyecto de Firebase
//    (Consola de Firebase › Configuración del proyecto › Tus apps › App web › "firebaseConfig").
//    Estos valores no son secretos: lo que protege tus datos son las reglas de Firestore (firestore.rules).
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// 2) Tu correo de Google: la app sólo deja entrar a estas cuentas.
//    Pon el MISMO correo en firestore.rules.
export const ALLOWED_EMAILS = ['info@acordeonixs.com'];
