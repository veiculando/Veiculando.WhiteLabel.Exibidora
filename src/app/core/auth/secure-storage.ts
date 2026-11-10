import * as CryptoJS from 'crypto-js';
import { Subject, distinctUntilChanged, filter, fromEvent, map, merge, startWith } from 'rxjs';

export class SecureStorage {
  private static readonly SECRET_KEY = 'Veiculando_Wl_Exibidora_Secret_CSR';

  private static readonly tokenAlterado = new Subject<string>();

  static observarToken(tokenKey: string) {
    return merge(
      this.tokenAlterado.pipe(filter((chave) => chave === tokenKey)),
      fromEvent<StorageEvent>(window, 'storage').pipe(
        filter((evento) => evento.key === tokenKey || evento.key === null),
      ),
    ).pipe(
      startWith(null),
      map(() => this.getToken(tokenKey)),
      distinctUntilChanged(),
    );
  }

  static setToken(tokenKey: string, rawToken: string): void {
    if (!rawToken) return;
    const encryptedToken = CryptoJS.AES.encrypt(rawToken, this.SECRET_KEY).toString();
    localStorage.setItem(tokenKey, encryptedToken);
    this.tokenAlterado.next(tokenKey);
  }

  static getToken(tokenKey: string): string | null {
    const encryptedToken = localStorage.getItem(tokenKey);
    if (!encryptedToken) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedToken, this.SECRET_KEY);
      const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedToken || null;
    } catch (e) {
      console.error('Error decrypting token from local storage', e);
      return null;
    }
  }

  static clear(tokenKey: string): void {
    localStorage.removeItem(tokenKey);
    this.tokenAlterado.next(tokenKey);
  }
}
