/**
 * Statuto dell'associazione, trascritto dalla scansione registrata (atto del
 * 15.05.2020). Solo gli articoli: l'atto costitutivo con i dati dei fondatori
 * resta nel PDF originale. Il testo è riportato così com'è; fa fede l'originale.
 * Ogni voce di `testo` è un paragrafo; un array è un elenco puntato.
 */
export type Blocco = string | string[];
export type Articolo = { n: number; titolo: string; testo: Blocco[] };

export const datiStatuto = {
  denominazione: 'Associazione musicale PNL Officina Creativa',
  adottato: '15 maggio 2020',
};

export const articoli: Articolo[] = [
  {
    n: 1,
    titolo: 'Denominazione, sede e durata',
    testo: [
      'L’associazione musicale è denominata “Associazione musicale PNL OFFICINA CREATIVA”.',
      'La sede associativa viene stabilita in Oderzo, Via Gaia Da Camino n. 3. La sede associativa potrà essere spostata, sempre nell’ambito comunale, senza necessità di variare il presente statuto.',
      'La durata dell’associazione è fissata a tutto il 31.12.2030.',
    ],
  },
  {
    n: 2,
    titolo: 'Finalità',
    testo: [
      'L’associazione intende svolgere le seguenti attività di interesse generale, previste dall’art. 5 decreto legislativo 117/2017: “l’organizzazione e la gestione di attività culturali artistiche o ricreative di interesse sociale”.',
      'Fini associativi sono lo studio, la pratica, l’approfondimento, in forma collettiva, e la diffusione della musica leggera.',
      'La pratica, lo studio e l’approfondimento della musica leggera è riservato agli associati, mentre la diffusione della stessa è rivolta alla generalità, pertanto non limitata agli associati.',
      'Per il miglior perseguimento dei fini divulgativi della musica leggera l’associazione potrà promuovere, organizzare o partecipare a spettacoli rivolti alla generalità, pubbliche esecuzioni, dibattiti, conferenze, corsi di aggiornamento e di approfondimento, presentazione di libri, mostre ed esposizioni di opere d’arte.',
      'Tutte le esibizioni pubbliche dell’associazione, come pure ogni altra forma di attività associativa, si intendono a titolo rigorosamente amatoriale e non professionale senza scopo di lucro avvalendosi in via prevalente dell’attività di volontariato dei propri associati.',
      'Inoltre l’associazione potrà esercitare, a norma dell’art. 6 del codice del terzo settore, attività strumentali rispetto alle attività di interesse generale quali la somministrazione di alimenti e bevande ed altre iniziative che saranno individuate dal Consiglio Direttivo nei limiti consentiti.',
      'L’associazione potrà infine programmare attività di raccolta fondi, in conformità alle disposizioni contenute nell’art. 7 del D. Legge 127/2017.',
    ],
  },
  {
    n: 3,
    titolo: 'Carattere e tipologia dell’associazione',
    testo: [
      'L’associazione non persegue fini di lucro. Essa ha carattere esclusivamente amatoriale ed è apartitica.',
      'L’associazione assume la forma di “associazione non riconosciuta” ai fini del codice civile, anche se potrà svolgere in via accessoria e marginale attività commerciale per coprire per quanto possibile le spese necessarie al conseguimento degli scopi associativi.',
      'Non è consentita in alcun modo la remunerazione degli associati per le loro prestazioni in ambito associativo, così come la distribuzione e l’assegnazione di utili, salvo il rimborso delle spese sostenute.',
      'Eventuali utili conseguiti dall’associazione non potranno essere distribuiti ma dovranno essere impiegati per attività istituzionali o per attività connesse.',
    ],
  },
  {
    n: 4,
    titolo: 'Dotazione patrimoniale',
    testo: [
      'L’associazione provvede alle attività statutarie con l’apporto volontaristico e non remunerato degli associati, nonché con i mezzi finanziari messi a disposizione dagli stessi associati e da terzi.',
      'Tutti gli associati sono tenuti a contribuire in misura equivalente alla dotazione patrimoniale dell’associazione.',
      'Costituiscono altresì dotazione patrimoniale gli impianti (strumenti musicali, amplificazione, illuminazione, registrazione e quant’altro), eventuali donazioni e contributi provenienti da persone o enti privati e/o pubblici, le entrate che derivano da saltuarie prestazioni amatoriali, i frutti derivanti dall’impiego della dotazione.',
      'In caso di scioglimento, il patrimonio associativo o le sopravvenienze attive di esso non potranno essere devolute ad alcuno dei associati ma dovranno essere destinate ad altra associazione o ente che persegua finalità analoghe o similari.',
    ],
  },
  {
    n: 5,
    titolo: 'Organi dell’associazione',
    testo: ['Gli organi dell’associazione sono i singoli associati, l’assemblea degli associati, il consiglio direttivo ed il presidente.'],
  },
  {
    n: 6,
    titolo: 'Associati',
    testo: [
      'Sono associati dell’associazione le persone fisiche che hanno sottoscritto il presente atto costitutivo e statuto nonché le persone fisiche ammesse a farne parte, a seguito di delibera insindacabile del consiglio direttivo, che abbiano accettato senza riserve il presente statuto.',
      'Gli associati sono tenuti a collaborare alla realizzazione degli scopi associativi nelle forme stabilite dall’assemblea e secondo le proprie possibilità.',
      'La qualifica di associato si perde per dimissioni, per decesso o per esclusione deliberata dall’assemblea degli associati.',
    ],
  },
  {
    n: 7,
    titolo: 'Assemblea degli associati',
    testo: [
      'L’assemblea è l’organo sovrano della società ed è composta da tutti gli associati.',
      'L’assemblea è convocata dal presidente e si riunisce almeno una volta all’anno entro sei mesi dalla conclusione dell’esercizio.',
      'È convocata a mezzo affissione di apposito avviso di convocazione presso la sede dell’associazione oppure mediante e-mail o messaggio sms, con otto giorni di anticipo rispetto alle date di convocazione.',
      'L’assemblea delibera sui seguenti argomenti:',
      [
        'approva il conto consuntivo e la relazione sull’annata;',
        'elegge i componenti del consiglio direttivo;',
        'elegge il presidente del consiglio direttivo;',
        'delibera sulla quota associativa annuale;',
        'approva eventuali modifiche statutarie;',
        'delibera su qualsiasi argomento sottoposto al suo esame dal consiglio direttivo.',
      ],
      'L’assemblea delibera in prima convocazione a maggioranza assoluta di tutti i soci ed in seconda convocazione a maggioranza assoluta dei soci presenti in assemblea. Per deliberare sulle modifiche statutarie o sullo scioglimento dell’associazione è necessaria l’approvazione della maggioranza assoluta dei soci anche in seconda convocazione.',
    ],
  },
  {
    n: 8,
    titolo: 'Consiglio direttivo',
    testo: [
      'Il consiglio direttivo è composto da un minimo di associati che va da due a sette componenti.',
      'Il consiglio direttivo dura in carica tre esercizi ed i componenti possono essere riconfermati senza limiti di tempo. Il consiglio direttivo delibera a maggioranza assoluta dei presenti ed è validamente costituito con la presenza della maggioranza assoluta dei suoi componenti.',
      'Il consiglio direttivo:',
      [
        'nomina presidente ed eventualmente vicepresidente qualora non vi abbia provveduto l’assemblea;',
        'decide la quota associativa;',
        'predispone il bilancio annuale da sottoporre all’assemblea degli associati;',
        'delibera in ordine all’ammissione di nuovi associati, sull’esclusione e/o recesso degli associati iscritti;',
        'decide su tutte le altre materie che non siano riservate alla competenza dell’assemblea degli associati e/o del presidente.',
      ],
    ],
  },
  {
    n: 9,
    titolo: 'Il presidente',
    testo: [
      'Il presidente viene eletto dall’assemblea degli associati, se non vi provvede il consiglio direttivo; resta in carica per la durata del consiglio salvo i casi di dimissione, decesso o revoca da parte dell’assemblea.',
      'Egli convoca e presiede l’assemblea degli associati e, in caso di impedimento, è sostituito dal vicepresidente se eletto o dall’associato di età più elevata.',
      'Il presidente ha la rappresentanza legale dell’associazione, ne ha il potere di firma, con possibilità di nominare procuratori speciali ex art. 2209 del codice civile, con delega per la rappresentanza e la conclusione di determinati negozi e/o contratti delegati dal consiglio direttivo.',
      'Fra i poteri delegati rientrano:',
      [
        'quello di aprire e chiudere conti presso istituti bancari e postali, firmarne i relativi assegni, dare e sottoscrivere disposizioni di qualunque tipo agli istituti bancari e postali presso i quali l’associazione detiene rapporti, ivi compresa la delega di firma ad altro associati o a terzi;',
        'sottoscrivere impegni o richieste, per conto dell’associazione, verso terzi e la pubblica amministrazione, enti locali e privati;',
        'rilasciare dichiarazioni o quietanze, concludere contratti;',
        'stare in giudizio per conto e a spese dell’associazione.',
      ],
    ],
  },
  {
    n: 10,
    titolo: 'Bilancio',
    testo: [
      'L’esercizio finanziario ha inizio il 1° gennaio e termine il 31 dicembre di ogni anno.',
      'Ai sensi art. 13 e 87 del decreto legislativo 117/2017 e relativa norma di attuazione sono redatte scritture contabili e bilancio dell’associazione.',
      'Il bilancio è redatto dal consiglio direttivo e sottoposto all’approvazione da parte dell’assemblea dei soci entro sei mesi dalla chiusura dell’esercizio.',
      'È vietata la distribuzione di utili o avanzi di gestione.',
      'Gli avanzi di gestione devono essere utilizzati per la realizzazione delle attività istituzionali previste dallo statuto.',
    ],
  },
  {
    n: 11,
    titolo: 'Scioglimento dell’associazione',
    testo: [
      'Lo scioglimento dell’associazione e la devoluzione del patrimonio sono deliberate dall’assemblea dei soci col voto favorevole della maggioranza assoluta di tutti i soci.',
      'L’assemblea che delibera lo scioglimento nomina il liquidatore.',
      'In assenza di componenti di attivo e passivo l’associazione può essere estinta senza procedura di liquidazione.',
      'Salvo che disposizioni legislative non dispongano diversamente, i beni dell’associazione devono essere devoluti a finalità di utilità sociale ad Enti del Terzo Settore secondo quanto previsto dall’art. 9 dec. leg.vo 117/2017.',
      'In ogni caso i beni dell’associazione non possono essere devoluti a soci, amministratori, dipendenti ai sensi art. 8 comma 2 dec. leg.vo 117/2017.',
    ],
  },
  {
    n: 12,
    titolo: 'Disposizioni finali',
    testo: ['Per quanto non previsto nel presente statuto si applicano, per quanto possibile, le disposizioni vigenti in materia.'],
  },
];
