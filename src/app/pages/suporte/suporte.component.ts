import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { exhaustMap, interval } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PermissionService } from '../../core/auth/permission.service';
import { SecureStorage } from '../../core/auth/secure-storage';
import { AuthService } from '../../core/services/auth.service';
import { SnapsSupportLoader } from './snaps-support-loader';

@Component({
  selector: 'app-suporte',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (falhou()) {
      <p role="alert">Não foi possível carregar o suporte. Recarregue a página para tentar novamente.</p>
    } @else if (!pronto()) {
      <p role="status">Carregando suporte…</p>
    } @else if (tokenAutorizado(); as token) {
      <!-- A URL do proxy precisa estar no elemento antes de ele se conectar. -->
      <snaps-support-board
        api-url="/api/wl/snaps"
        project-id="53896f31-9d7f-458b-ab63-8bd6ddb549f6"
        repositories="Veiculando.WhiteLabel.Exibidora,Veiculando.WhiteLabel.App,aurum-landing-page"
        default-repository="Veiculando.WhiteLabel.Exibidora"
        [attr.api-key]="token"
      />
    }
  `,
})
export class SuporteComponent {
  private readonly permissao = inject(PermissionService);
  private readonly auth = inject(AuthService);
  private readonly jwt = toSignal(SecureStorage.observarToken(environment.tokenKey), {
    requireSync: true,
  });

  protected readonly pronto = signal(false);
  protected readonly falhou = signal(false);
  protected readonly tokenAutorizado = computed(() => {
    const token = this.jwt();
    return token && this.permissao.has('SuporteGerenciar') ? token : null;
  });

  constructor() {
    void inject(SnapsSupportLoader).carregar().then(
      () => this.pronto.set(true),
      () => this.falhou.set(true),
    );

    // A sessão também renova quando o operador permanece na tela, sem navegar.
    inject(NgZone).runOutsideAngular(() => {
      interval(60_000).pipe(
        exhaustMap(() => this.auth.garantirTokenValido()),
        takeUntilDestroyed(),
      ).subscribe();
    });
  }
}
