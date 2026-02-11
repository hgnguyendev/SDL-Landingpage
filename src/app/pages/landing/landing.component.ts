import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  OnDestroy,
  HostListener,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TrackingService } from '../../core/tracking.service';

const H1_V1 =
  "L'écosystème de gestion qui fait gagner des heures, tous les jours.";
const H1_V2 =
  'Le tout-en-un syndic au prix le plus simple : au lot, tout inclus.';

const SYNDIC_EUR_PER_LOT = 1;
const SYNDIC_MIN_EUR = 50;
const GESTION_EUR_PER_LOT = 5;

export const DEMO_VIDEOS = [
  { id: 'overview', title: 'Vue d\u2019ensemble & philosophie produit', duration: '2 min', videoId: 'dQw4w9WgXcQ' },
  { id: 'incidents', title: 'Incidents / demandes / suivi terrain', duration: '3 min', videoId: 'dQw4w9WgXcQ' },
  { id: 'automations', title: 'Automatisations & gain de temps', duration: '2 min', videoId: 'dQw4w9WgXcQ' },
  { id: 'accounting', title: 'Comptabilit\u00e9 / rapprochements / contr\u00f4le', duration: '3 min', videoId: 'dQw4w9WgXcQ' },
] as const;

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Combien de temps pour \u00eatre op\u00e9rationnel ?',
    answer:
      'Apr\u00e8s le diagnostic et le plan de migration, la phase de formation et d\u00e9marrage permet d\u2019\u00eatre op\u00e9rationnel en quelques semaines. La dur\u00e9e exacte d\u00e9pend du volume de lots et des processus \u00e0 migrer.',
  },
  {
    question: 'Qu\u2019est-ce qui est inclus ?',
    answer:
      'L\u2019\u00e9cosyst\u00e8me inclut la gestion op\u00e9rationnelle, les incidents et demandes, les automatisations, la comptabilit\u00e9 et rapprochements, la communication et r\u00e9unions, ainsi que l\u2019IA int\u00e9gr\u00e9e. Les consommables tiers (ex. courrier) ne sont pas illimit\u00e9s.',
  },
  {
    question: 'Comment sont g\u00e9r\u00e9s les consommables ?',
    answer:
      'Les consommables tiers (courrier, envois, etc.) sont factur\u00e9s selon l\u2019usage ou des forfaits. Ils ne peuvent pas \u00eatre illimit\u00e9s ; les conditions pr\u00e9cises sont d\u00e9taill\u00e9es dans l\u2019offre et lors de la d\u00e9mo.',
  },
  {
    question: 'Peut-on commencer petit ?',
    answer:
      'Oui. Vous pouvez d\u00e9marrer avec un p\u00e9rim\u00e8tre r\u00e9duit (nombre de lots, modules) et \u00e9tendre progressivement. La tarification au lot permet de faire \u00e9voluer le volume sans changement de formule.',
  },
  {
    question: 'S\u00e9curit\u00e9 & RGPD ?',
    answer:
      'Les donn\u00e9es sont h\u00e9berg\u00e9es et trait\u00e9es dans le respect du RGPD. S\u00e9curit\u00e9 des acc\u00e8s, chiffrement et bonnes pratiques sont appliqu\u00e9s. Les d\u00e9tails sont disponibles sur demande et en d\u00e9mo.',
  },
];

export const CALENDLY_URL = 'https://calendly.com/syndilibre';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly tracking = inject(TrackingService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elRef = inject(ElementRef);
  private revealObserver?: IntersectionObserver;

  /** A/B variant from ?v=1 or ?v=2 */
  readonly variant = signal<1 | 2>(1);
  readonly syndicLots = signal<number>(50);
  readonly gestionLots = signal<number>(0);

  readonly syndicPrice = computed(() =>
    Math.max(SYNDIC_MIN_EUR, this.syndicLots() * SYNDIC_EUR_PER_LOT),
  );
  readonly gestionPrice = computed(
    () => this.gestionLots() * GESTION_EUR_PER_LOT,
  );
  readonly totalPrice = computed(
    () => this.syndicPrice() + this.gestionPrice(),
  );
  readonly headline = computed(() =>
    this.variant() === 2 ? H1_V2 : H1_V1,
  );

  @ViewChild('videoContainer') videoContainerRef?: ElementRef<HTMLElement>;
  private videoLoaded = false;

  readonly demoVideos = DEMO_VIDEOS;
  readonly modalVideo = signal<(typeof DEMO_VIDEOS)[number] | null>(null);
  readonly openFaqIndex = signal<number | null>(null);
  readonly faqItems = FAQ_ITEMS;
  readonly isScrolled = signal(false);

  demoForm: FormGroup = this.fb.group({
    nom: [''],
    cabinet: [''],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    portefeuille: [''],
    message: [''],
    website: [''],
  });

  readonly formSubmitted = signal(false);
  readonly calendlyUrl = CALENDLY_URL;

  /* ── Lifecycle ── */

  ngOnInit(): void {
    this.tracking.pageView();
    const v = this.route.snapshot.queryParamMap.get('v');
    this.variant.set(v === '2' ? 2 : 1);
    this.route.queryParamMap.subscribe((params) => {
      this.variant.set(params.get('v') === '2' ? 2 : 1);
    });
  }

  ngAfterViewInit(): void {
    this.observeVideoLazyLoad();
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  /* ── Navbar scroll ── */

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled.set(window.scrollY > 60);
    }
  }

  /* ── Scroll reveal with stagger ── */

  private initScrollReveal(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      typeof IntersectionObserver === 'undefined'
    )
      return;

    const els: NodeListOf<HTMLElement> =
      this.elRef.nativeElement.querySelectorAll('.reveal');

    // Stagger siblings: group by parent, add transition-delay
    const groups = new Map<Element, HTMLElement[]>();
    els.forEach((el: HTMLElement) => {
      const parent = el.parentElement!;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent)!.push(el);
    });
    groups.forEach((children) => {
      children.forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.08}s`;
      });
    });

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            this.revealObserver?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    els.forEach((el: Element) => this.revealObserver?.observe(el));
  }

  /* ── Video lazy load ── */

  private observeVideoLazyLoad(): void {
    if (
      !this.videoContainerRef?.nativeElement ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.videoLoaded)
          this.loadVideoIframe();
      },
      { rootMargin: '100px' },
    );
    observer.observe(this.videoContainerRef.nativeElement);
  }

  private loadVideoIframe(): void {
    const container = this.videoContainerRef?.nativeElement;
    if (!container) return;
    const placeholder = container.querySelector('[data-video-placeholder]');
    const slot = container.querySelector('[data-video-slot]');
    if (!slot) return;
    this.videoLoaded = true;
    slot.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0" title="D\u00e9mo Syndilibre" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    placeholder?.classList.add('hidden');
  }

  /* ── FAQ ── */

  toggleFaq(index: number): void {
    this.openFaqIndex.set(this.openFaqIndex() === index ? null : index);
  }

  /* ── Tracking / CTA handlers ── */

  onDemoRequest(source: string): void {
    const ctaSource: 'hero' | 'video' | 'pricing' | 'final' =
      source === 'hero'
        ? 'hero'
        : source === 'calculator_estimation'
          ? 'pricing'
          : source.startsWith('video_usage') || source === 'mise_en_place'
            ? 'video'
            : 'final';
    this.tracking.ctaClick(ctaSource);
    this.tracking.trackDemoRequest(source);
  }

  onEstimationRequest(): void {
    this.tracking.ctaClick('pricing');
    this.tracking.trackDemoRequest('calculator_estimation');
  }

  onSubmitDemoForm(): void {
    if (this.demoForm.get('website')?.value) return;
    if (this.demoForm.invalid) {
      this.demoForm.markAllAsTouched();
      this.tracking.leadSubmit('error');
      return;
    }
    this.tracking.ctaClick('final');
    this.tracking.trackDemoRequest('form_final');
    this.tracking.leadSubmit('success');
    this.formSubmitted.set(true);
  }

  onVideoClick(): void {
    this.tracking.ctaClick('video');
    this.tracking.videoPlay('hero_demo');
    this.tracking.trackVideoClick('hero_demo');
    if (!this.videoLoaded) this.loadVideoIframe();
  }

  onAllVideosClick(): void {
    this.tracking.ctaClick('video');
    this.tracking.trackAllVideosClick();
    document
      .getElementById('videos-usage')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  onMiseEnPlaceDemoClick(event: Event): void {
    event.preventDefault();
    this.tracking.ctaClick('video');
    this.tracking.trackVideoClick('mise_en_place');
    document
      .getElementById('videos-usage')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  openVideoModal(video: (typeof DEMO_VIDEOS)[number]): void {
    this.tracking.videoPlay(video.id);
    this.tracking.trackVideoClick(`usage_${video.id}`);
    this.modalVideo.set(video);
  }

  closeVideoModal(): void {
    this.modalVideo.set(null);
  }

  onDemoRequestFromVideo(videoId: string): void {
    this.tracking.ctaClick('video');
    this.tracking.trackDemoRequest(`video_usage_${videoId}`);
  }

  getVideoEmbedUrl(
    video: (typeof DEMO_VIDEOS)[number],
  ): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`,
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalVideo()) this.closeVideoModal();
  }

  setSyndicLots(value: number): void {
    this.syndicLots.set(Math.max(0, Math.round(value)));
    this.emitPricingCalculated();
  }

  setGestionLots(value: number): void {
    this.gestionLots.set(Math.max(0, Math.round(value)));
    this.emitPricingCalculated();
  }

  private emitPricingCalculated(): void {
    this.tracking.trackPricingCalculated(
      this.syndicLots(),
      this.gestionLots(),
      this.totalPrice(),
    );
  }
}
