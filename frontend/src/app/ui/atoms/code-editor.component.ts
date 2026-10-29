import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  afterNextRender,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import loader from '@monaco-editor/loader';
import { ThemeService } from '../../core/theme.service';

export interface CodeTemplate {
  name: string;
  code: string;
}

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col w-full border border-border-default rounded-lg overflow-hidden bg-bg-surface">
      <!-- Toolbar: Templates -->
      <div class="flex items-center justify-between px-4 py-2 bg-bg-muted border-b border-border-default">
        <span class="text-sm font-semibold text-text-secondary">
          {{ title }}
        </span>
        
        <div class="flex items-center gap-2" *ngIf="templates.length > 0">
          <label class="text-xs text-text-tertiary">Templates:</label>
          <select 
            class="text-sm bg-bg-field text-text-primary border border-border-default rounded-md px-2 py-1 outline-none focus:border-border-focus focus:shadow-focus-ring"
            (change)="applyTemplate($event)"
          >
            <option value="">-- Select --</option>
            <option *ngFor="let tpl of templates; let i = index" [value]="i">
              {{ tpl.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Editor Container -->
      <div class="w-full relative" [style.height]="height">
        <div #editorContainer class="absolute inset-0 w-full h-full"></div>
      </div>
    </div>
  `
})
export class CodeEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  @Input() title: string = 'Code Editor';
  @Input() height: string = '400px';
  @Input() language: string = 'json';
  @Input() code: string = '';
  @Input() templates: CodeTemplate[] = [];

  @Output() codeChange = new EventEmitter<string>();

  private editor: any;
  private monaco: any;
  private theme = inject(ThemeService);

  constructor() {
    afterNextRender(() => {
      this.initMonaco();
    });
    effect(() => {
      const monacoTheme = this.theme.isDarkMode() ? 'vs-dark' : 'vs';
      this.monaco?.editor.setTheme(monacoTheme);
    });
  }

  ngOnInit() {}

  async initMonaco() {
    try {
      const monaco = await loader.init();
      this.monaco = monaco;
      
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: this.code,
        language: this.language,
        theme: this.theme.isDarkMode() ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        formatOnPaste: true,
        formatOnType: true,
        fontSize: 14,
        padding: { top: 16, bottom: 16 }
      });

      this.editor.onDidChangeModelContent(() => {
        const newValue = this.editor.getValue();
        this.codeChange.emit(newValue);
      });
    } catch (error) {
      console.error('Failed to load Monaco editor:', error);
    }
  }

  applyTemplate(event: any) {
    const index = event.target.value;
    if (index === '') return;
    
    const template = this.templates[index];
    if (template && this.editor) {
      this.editor.setValue(template.code);
    }
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.dispose();
    }
  }
}
