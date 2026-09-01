import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SetupModalComponent } from './ui/organisms/setup-modal.component';
import { ToastHostComponent } from './ui/organisms/toast-host.component';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SetupModalComponent, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('Feeder');

  constructor(
    private translate: TranslateService,
    private themeService: ThemeService,
  ) {
    const browserLang = this.translate.getBrowserLang();
    this.translate.use(browserLang?.match(/en|es|pt/) ? browserLang : 'en');
  }
}
