import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Service de tracking (GA4 + Meta Pixel).
 * Placeholders : remplacer les IDs par les vrais identifiants en production.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = () => isPlatformBrowser(this.platformId);

  /** ID de mesure GA4 (placeholder) */
  private readonly ga4Id = 'G-XXXXXXXXXX';

  /** Meta Pixel ID (placeholder) */
  private readonly metaPixelId = 'XXXXXXXXXXXXXXX';

  /** Envoi d’un événement vers GA4 */
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    if (!this.isBrowser()) return;
    if (typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        'event',
        action,
        { event_category: category, event_label: label, value }
      );
    }
  }

  /** page_view — au chargement de la landing */
  pageView(): void {
    this.trackEvent('engagement', 'page_view');
    this.trackMetaEvent('PageView');
  }

  /** video_play — id_video (ex. hero, overview, incidents, …) */
  videoPlay(idVideo: string): void {
    this.trackEvent('video', 'video_play', idVideo);
  }

  /** cta_click — hero | video | pricing | final */
  ctaClick(source: 'hero' | 'video' | 'pricing' | 'final'): void {
    this.trackEvent('cta', 'cta_click', source);
  }

  /** pricing_calculated — déjà envoyé par trackPricingCalculated */
  trackPricingCalculated(syndicLots: number, glLots: number, totalMonthly: number): void {
    this.trackEvent('pricing', 'pricing_calculated', `syndic:${syndicLots}|gl:${glLots}`, totalMonthly);
  }

  /** lead_submit — success | error */
  leadSubmit(status: 'success' | 'error'): void {
    this.trackEvent('lead', 'lead_submit', status);
    this.trackMetaEvent('Lead', { status });
  }

  /** Clic sur le CTA principal "Demander une démo" (conserve l’ancien event + cta_click) */
  trackDemoRequest(source: string): void {
    this.trackEvent('cta', 'demo_request', source);
    this.trackMetaEvent('DemoRequest', { content_name: source });
  }

  /** Clic "Voir la démo" (vidéo) */
  trackVideoClick(label: string): void {
    this.trackEvent('video', 'play', label);
  }

  /** Clic "Voir toutes les vidéos" */
  trackAllVideosClick(): void {
    this.trackEvent('cta', 'all_videos_click');
  }

  /** Événement Meta (Facebook Pixel) */
  private trackMetaEvent(eventName: string, params?: Record<string, unknown>): void {
    if (!this.isBrowser()) return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === 'function') {
      fbq('track', eventName, params);
    }
  }

  /** Retourne les IDs pour injection dans index.html (script GA4 / Meta) */
  getGa4Id(): string {
    return this.ga4Id;
  }

  getMetaPixelId(): string {
    return this.metaPixelId;
  }
}
