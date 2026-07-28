const STRINGS = Object.freeze({
  accessDenied: 'No tens accés a aquesta aplicació',
  outOfPeriod: 'Actualment no ens trobem en cap període acadèmic',
  noIncidents: 'No hi ha incidències en aquest període',
  importApiError: "No s'ha pogut descarregar l'informe des de l'API",
  save: {
    empty: 'No hi ha registres pendents de desar.',
    success: 'Registres desats correctament.',
    failed: 'No s’han pogut desar els registres.'
  },
  meetingRecords: {
    deleted: 'Registre esborrat correctament.',
    deleteNotFound: 'No s’ha trobat cap registre desat per esborrar.'
  },
  tuesdaySessions: {
    emptySave: 'No hi ha comentaris pendents de desar.',
    saved: 'Comentaris desats correctament.'
  },
  studyGroup: {
    saved: 'Sessions de dimarts desades.'
  },
  thirdProject: {
    saved: 'Assignacions 3R desades.',
    outcomeSaved: 'Aprofitament desat correctament.',
    emptyOutcomeSave: 'No hi ha canvis pendents de desar.'
  },
  email: {
    senderName: 'Equip de convivència'
  },
  expulsion: {
    saved: 'Expulsió desada i correu enviat.',
    emailSubjectPrefix: 'Document de sanció greu',
    emailBody: [
      'Benvolgut claustre,',
      '',
      "Aquest missatge es genera de manera automàtica cada vegada que es completa el formulari d'expedients abreujats. Us demanem que us fixeu en el nom de l'alumne per si és del vostre curs. Si ho és, assegureu-vos que no poseu falta injustificada a Dinantia i que faciliteu feina pels dies que estigui fora de l'institut.",
      '',
      "Si creus que hi ha cap errada en la gestió del document, no et posis en contacte amb l'adreça d'aquest correu (admindomini@iernestlluch.cat), ja que només funciona per automatismes programats com aquest. És preferible derivar-ho a cap d'estudis o direcció.",
      '',
      "Si ets la persona que has generat l'expulsió/sanció:",
      '',
      "- Revisa el document adjunt per si vols fer cap retoc o revisar el redactat/faltes d'ortografia.",
      "- Imprimeix dues còpies del document. Una és per la família, que l'ha de signar. Com alternativa, si has avisat prèviament la família, també podries enviar-la per Dinantia.una per a l'institut (a entregar al cap d'estudis) i una altra pel representant de la família. L'altra còpia, que també signa la família, ha de quedar guardar-se per part de la cap d'estudis.",
      '',
      'Document: {{documentUrl}}',
      '',
      'Atentament,'
    ].join('\n')
  }
});
