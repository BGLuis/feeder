import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  afterNextRender
} from '@angular/core';
import { CommonModule } from '@angular/common';
import loader from '@monaco-editor/loader';

export interface CodeTemplate {
  name: string;
  code: string;
}

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
      <!-- Toolbar: Templates -->
      <div class="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {{ title }}
        </span>
        
        <div class="flex items-center gap-2" *ngIf="templates.length > 0">
          <label class="text-xs text-zinc-500">Modelos prontos:</label>
          <select 
            class="text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
            (change)="applyTemplate($event)"
          >
            <option value="">-- Selecione --</option>
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

  @Input() title: string = 'Editor de Código';
  @Input() height: string = '400px';
  @Input() language: string = 'json';
  @Input() code: string = '';
  @Input() templates: CodeTemplate[] = [];

  @Output() codeChange = new EventEmitter<string>();

  private editor: any;

  constructor() {
    afterNextRender(() => {
      this.initMonaco();
    });
  }

  ngOnInit() {}

  async initMonaco() {
    try {
      const monaco = await loader.init();
      
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: this.code,
        language: this.language,
        theme: 'vs-dark', // Ou 'vs' para light theme
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
