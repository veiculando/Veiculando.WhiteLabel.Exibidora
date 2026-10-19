import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';

@Component({
  selector: 'app-usuarios-operadores',
  imports: [ReactiveFormsModule, AurumPageHeaderComponent, AurumCardComponent, AurumButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <aurum-page-header titulo="Usuários Operadores" subtitulo="Quem entra no aplicativo de campo, como colador ou fiscal." />
    <aurum-card>
      <form [formGroup]="form" (ngSubmit)="criar()">
        <label for="nome">Nome</label>
        <input id="nome" type="text" formControlName="nome" />
        <label for="email">E-mail</label>
        <input id="email" type="email" formControlName="email" />
        <label><input type="checkbox" formControlName="colador" /> Colador</label>
        <label><input type="checkbox" formControlName="fiscal" /> Fiscal</label>
        <aurum-button tipo="submit" [desabilitado]="salvando">Criar operador</aurum-button>
        @if (aviso) { <p role="status">{{ aviso }}</p> }
        @if (erro) { <p role="alert">{{ erro }}</p> }
      </form>
    </aurum-card>
  `,
})
export class UsuariosOperadoresComponent {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  salvando = false;
  aviso = '';
  erro = '';
  form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    colador: false,
    fiscal: false,
  });

  criar(): void {
    if (this.form.invalid) return;
    this.salvando = true;
    this.erro = '';
    this.aviso = '';
    this.http.post(`${environment.bffUrl}/usuarios-operadores`, this.form.getRawValue()).subscribe({
      next: () => {
        this.salvando = false;
        this.aviso = 'Operador criado.';
        this.form.reset({ nome: '', email: '', colador: false, fiscal: false });
      },
      error: () => {
        this.salvando = false;
        this.erro = 'Não foi possível criar o operador.';
      },
    });
  }
}
