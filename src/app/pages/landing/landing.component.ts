import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  HostListener,
} from '@angular/core';
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

/** Vidéos de démo par usage (IDs YouTube/Vimeo à remplacer) */
export const DEMO_VIDEOS = [
  { id: 'overview', title: 'Vue d’ensemble & philosophie produit', duration: '2 min', videoId: 'dQw4w9WgXcQ' },
  { id: 'incidents', title: 'Incidents / demandes / suivi terrain', duration: '3 min', videoId: 'dQw4w9WgXcQ' },
  { id: 'automations', title: 'Automatisations & gain de temps', duration: '2 min', videoId: 'dQw4w9WgXcQ' },
  { id: 'accounting', title: 'Comptabilité / rapprochements / contrôle', duration: '3 min', videoId: 'dQw4w9WgXcQ' },
] as const;

/** FAQ : questions et réponses (texte à adapter) */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Combien de temps pour être opérationnel ?',
    answer: 'Après le diagnostic et le plan de migration, la phase de formation et démarrage permet d’être opérationnel en quelques semaines. La durée exacte dépend du volume de lots et des processus à migrer.',
  },
  {
    question: "Qu'est-ce qui est inclus ?",
    answer: "L’écosystème inclut la gestion opérationnelle, les incidents et demandes, les automatisations, la comptabilité et rapprochements, la communication et réunions, ainsi que l’IA intégrée. Les consommables tiers (ex. courrier) ne sont pas illimités.",
  },
  {
    question: 'Comment sont gérés les consommables ?',
    answer: 'Les consommables tiers (courrier, envois, etc.) sont facturés selon l’usage ou des forfaits. Ils ne peuvent pas être illimités ; les conditions précises sont détaillées dans l’offre et lors de la démo.',
  },
  {
    question: 'Peut-on commencer petit ?',
    answer: 'Oui. Vous pouvez démarrer avec un périmètre réduit (nombre de lots, modules) et étendre progressivement. La tarification au lot permet de faire évoluer le volume sans changement de formule.',
  },
  {
    question: 'Sécurité & RGPD ?',
    answer: 'Les données sont hébergées et traitées dans le respect du RGPD. Sécurité des accès, chiffrement et bonnes pratiques sont appliqués. Les détails sont disponibles sur demande et en démo.',
  },
];

/** URL Calendly (placeholder) */
export const CALENDLY_URL = 'https://calendly.com/syndilibre';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tracking = inject(TrackingService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fb = inject(FormBuilder);

  /** Variant A/B depuis ?v=1 ou ?v=2 (défaut: 1) */
  readonly variant = signal<1 | 2>(1);

  /** Nombre de lots syndic */
  readonly syndicLots = signal<number>(50);
  /** Nombre de lots gestion locative */
  readonly gestionLots = signal<number>(0);

  readonly syndicPrice = computed(() =>
    Math.max(SYNDIC_MIN_EUR, this.syndicLots() * SYNDIC_EUR_PER_LOT)
  );
  readonly gestionPrice = computed(() => this.gestionLots() * GESTION_EUR_PER_LOT);
  readonly totalPrice = computed(() => this.syndicPrice() + this.gestionPrice());

  readonly headline = computed(() =>
    this.variant() === 2 ? H1_V2 : H1_V1
  );

  @ViewChild('videoContainer') videoContainerRef?: ElementRef<HTMLElement>;
  private videoLoaded = false;

  /** Vidéos thématiques (référence pour le template) */
  readonly demoVideos = DEMO_VIDEOS;

  /** Vidéo actuellement ouverte dans le modal (null = fermé) */
  readonly modalVideo = signal<typeof DEMO_VIDEOS[number] | null>(null);

  /** Index du panneau FAQ ouvert (null = aucun) */
  readonly openFaqIndex = signal<number | null>(null);

  readonly faqItems = FAQ_ITEMS;

  /** Formulaire CTA final */
  demoForm: FormGroup = this.fb.group({
    nom: [''],
    cabinet: [''],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    portefeuille: [''],
    message: [''],
    website: [''], // honeypot
  });

  readonly formSubmitted = signal(false);
  readonly calendlyUrl = CALENDLY_URL;

  toggleFaq(index: number): void {
    this.openFaqIndex.set(this.openFaqIndex() === index ? null : index);
  }

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
  }

  private observeVideoLazyLoad(): void {
    if (!this.videoContainerRef?.nativeElement || typeof IntersectionObserver === 'undefined')
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !this.videoLoaded) this.loadVideoIframe();
      },
      { rootMargin: '100px' }
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
    // YouTube placeholder (remplacer par l’ID vidéo réel)
    slot.innerHTML = `
      <iframe
        width="560"
        height="315"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
        title="Démo Syndilibre"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
    placeholder?.classList.add('hidden');
  }

  onDemoRequest(source: string): void {
    const ctaSource: 'hero' | 'video' | 'pricing' | 'final' =
      source === 'hero' ? 'hero'
      : source === 'calculator_estimation' ? 'pricing'
      : source.startsWith('video_usage') || source === 'mise_en_place' ? 'video'
      : 'final';
    this.tracking.ctaClick(ctaSource);
    this.tracking.trackDemoRequest(source);
  }

  onEstimationRequest(): void {
    this.tracking.ctaClick('pricing');
    this.tracking.trackDemoRequest('calculator_estimation');
  }

  onSubmitDemoForm(): void {
    const honeypot = this.demoForm.get('website')?.value;
    if (honeypot) return; // anti-spam
    if (this.demoForm.invalid) {
      this.demoForm.markAllAsTouched();
      this.tracking.leadSubmit('error');
      return;
    }
    this.tracking.ctaClick('final');
    this.tracking.trackDemoRequest('form_final');
    this.tracking.leadSubmit('success');
    this.formSubmitted.set(true);
    // TODO: envoyer vers API ou mailto
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
    document.getElementById('videos-usage')?.scrollIntoView({ behavior: 'smooth' });
  }

  onMiseEnPlaceDemoClick(event: Event): void {
    event.preventDefault();
    this.tracking.ctaClick('video');
    this.tracking.trackVideoClick('mise_en_place');
    document.getElementById('videos-usage')?.scrollIntoView({ behavior: 'smooth' });
  }

  openVideoModal(video: typeof DEMO_VIDEOS[number]): void {
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

  getVideoEmbedUrl(video: typeof DEMO_VIDEOS[number]): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`
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
      this.totalPrice()
    );
  }
}
