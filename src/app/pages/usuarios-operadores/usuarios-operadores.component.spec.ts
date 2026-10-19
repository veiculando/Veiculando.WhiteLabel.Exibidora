import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsuariosOperadoresComponent } from './usuarios-operadores.component';
import { environment } from '../../../environments/environment';

describe('UsuariosOperadoresComponent', () => {
  it('cria o operador com colador e fiscal no endpoint novo', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UsuariosOperadoresComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      nome: 'Joao Campo',
      email: 'joao@exemplo.com',
      colador: true,
      fiscal: false,
    });
    fixture.componentInstance.criar();

    const req = http.expectOne(`${environment.bffUrl}/usuarios-operadores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nome: 'Joao Campo',
      email: 'joao@exemplo.com',
      colador: true,
      fiscal: false,
    });
    req.flush({ id: 1, usuarioOperadorId: 2 });
    expect(fixture.componentInstance.aviso).toBe('Operador criado.');
    http.verify();
  });
});
