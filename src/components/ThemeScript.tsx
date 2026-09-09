import { themes, DEFAULT_THEME_ID } from '@/lib/themes'

const STORAGE_KEY = 'timesheet-theme'

/**
 * Applica il tema salvato *prima* della prima pittura.
 *
 * ThemeProvider legge `localStorage` in un `useEffect`, cioè dopo l'idratazione: chi usa un
 * tema diverso da quello di default vedeva un lampo del tema di default a ogni caricamento.
 * Lo script gira in modo sincrono nel body, con la tabella dei temi serializzata al build.
 */
export default function ThemeScript() {
  const themeVars = Object.fromEntries(
    themes.map((t) => [t.id, { vars: t.vars, colorScheme: t.colorScheme }]),
  )

  const script = `(function(){try{
var T=${JSON.stringify(themeVars)};
var id=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
var t=T[id]||T[${JSON.stringify(DEFAULT_THEME_ID)}];
if(!t)return;
var r=document.documentElement;
for(var k in t.vars)r.style.setProperty(k,t.vars[k]);
r.style.colorScheme=t.colorScheme;
}catch(e){}})();`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
