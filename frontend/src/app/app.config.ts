import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { TranslateLoader, provideTranslateService, provideTranslateLoader, TranslationObject } from '@ngx-translate/core';

class HttpLoader extends TranslateLoader {
  constructor(private http: HttpClient) {
    super();
  }
  
  getTranslation(lang: string) {
    return this.http.get<TranslationObject>(`./i18n/${lang}.json`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
      loader: provideTranslateLoader(() => new HttpLoader(inject(HttpClient)))
    })
  ]
};
