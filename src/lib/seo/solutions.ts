export const SOLUTIONS = [
  {
    slug: "crm-pme", label: "CRM pour PME", title: "CRM pour PME et indépendants en Côte d’Ivoire",
    description: "Centralisez prospects, clients et suivi commercial avec Alymero, un CRM en français pour les indépendants, agences et PME en Côte d’Ivoire.",
    intro: "Une demande entrante, un contact à relancer, une proposition à préparer : retrouvez votre relation client dans un espace commun à votre équipe.",
    sections: [
      { title: "Retrouvez l’historique de chaque contact", text: "Regroupez les coordonnées de vos prospects et clients, leur entreprise et les informations utiles à votre suivi. Retrouvez les devis, contrats et projets associés au lieu de les rechercher dans plusieurs fichiers." },
      { title: "Suivez votre activité commerciale", text: "Organisez vos contacts selon leur progression commerciale et gardez une trace de vos échanges. Les formulaires publics peuvent alimenter votre base de prospects pour éviter une ressaisie des demandes." },
      { title: "Travaillez avec des accès adaptés", text: "Invitez vos collaborateurs dans votre organisation et attribuez des rôles selon leurs missions. La gestion des contacts s’inscrit dans le même parcours que les rendez-vous, les devis et les projets." },
    ],
    questions: [
      { question: "À qui s’adresse ce CRM ?", answer: "Alymero s’adresse aux indépendants, agences et petites entreprises qui souhaitent relier leur suivi commercial à leurs documents et à leurs projets, dans une interface en français." },
      { question: "Peut-on recueillir des demandes en ligne ?", answer: "Oui. Les formulaires publics permettent de recueillir les informations de vos prospects et de les retrouver dans votre organisation." },
    ],
  },
  {
    slug: "devis-factures", label: "Devis et factures", title: "Logiciel de devis et facturation pour PME en Côte d’Ivoire",
    description: "Créez vos devis, générez vos factures PDF et suivez les règlements avec Alymero. Une gestion commerciale en français pour les PME et indépendants.",
    intro: "Passez de la proposition commerciale au suivi des règlements sans perdre le lien avec votre client. Alymero rassemble les devis, contrats, factures et paiements dans votre organisation.",
    sections: [
      { title: "Préparez des devis à partir de vos prestations", text: "Retrouvez vos services dans un catalogue, composez les lignes de votre devis et calculez les montants. Partagez le document avec votre client et suivez sa réponse depuis le même espace." },
      { title: "Générez et partagez vos factures", text: "Établissez vos factures avec leur numéro, leurs lignes et les informations de votre organisation. Les documents PDF permettent de transmettre une version lisible à vos clients." },
      { title: "Distinguez paiements déclarés et confirmés", text: "Un client peut déclarer un règlement depuis son espace. Votre équipe contrôle cette déclaration avant de la confirmer. Alymero permet de suivre les encaissements ; cette déclaration ne remplace pas un contrôle bancaire et ne débite pas automatiquement le client." },
    ],
    questions: [
      { question: "Les documents peuvent-ils être téléchargés en PDF ?", answer: "Oui. Les devis et factures peuvent être générés en PDF pour être partagés avec vos clients." },
      { question: "Alymero prélève-t-il automatiquement les paiements ?", answer: "Le parcours présenté permet de déclarer puis de confirmer les règlements. Une déclaration client ne constitue pas à elle seule une preuve d’encaissement." },
    ],
  },
  {
    slug: "gestion-projets", label: "Gestion de projets", title: "Gestion de projets et tâches pour agences et PME",
    description: "Organisez projets, tâches et documents avec Alymero. Reliez l’exécution de vos prestations au suivi de vos clients, devis et factures.",
    intro: "Après l’accord commercial, gardez une vue claire sur le travail à réaliser. Les projets Alymero relient les équipes, les tâches et les documents au dossier du client.",
    sections: [
      { title: "Structurez les étapes de vos prestations", text: "Organisez vos projets en étapes et en tâches pour rendre les prochaines actions plus lisibles. Retrouvez leur état d’avancement dans l’espace de votre organisation." },
      { title: "Répartissez les tâches de votre équipe", text: "Attribuez les tâches aux membres concernés et suivez leur progression. Les rôles des membres permettent de distinguer les missions commerciales, comptables et opérationnelles." },
      { title: "Conservez les documents dans le contexte du projet", text: "Associez les fichiers nécessaires au projet et retrouvez-les avec le dossier de votre client. Les documents privés sont accessibles à travers des contrôles d’autorisation." },
    ],
    questions: [
      { question: "Le projet reste-t-il lié au client ?", answer: "Oui. Les projets appartiennent à votre organisation et sont associés au dossier du contact concerné, pour garder le contexte commercial et opérationnel." },
      { question: "Peut-on affecter une tâche à un collaborateur ?", answer: "Oui. Les tâches peuvent être attribuées aux membres de votre équipe afin de clarifier les responsabilités." },
    ],
  },
  {
    slug: "portail-client", label: "Portail client", title: "Portail client pour devis, contrats et suivi de projets",
    description: "Donnez à vos clients un espace pour consulter leurs documents, répondre aux devis et suivre leurs projets avec Alymero, en français.",
    intro: "Offrez à votre client un point d’entrée pour retrouver les informations de sa prestation, sans multiplier les pièces jointes et les messages de suivi.",
    sections: [
      { title: "Retrouvez les documents du dossier", text: "Le portail réunit les devis, contrats et factures associés au contact. Le client peut retrouver le parcours de sa prestation dans un espace prévu pour lui." },
      { title: "Facilitez les réponses et les démarches", text: "Les liens de consultation permettent de répondre à un devis envoyé, de suivre un contrat à signer ou de consulter une facture. Les actions disponibles dépendent du statut du document." },
      { title: "Partagez une vue sur l’avancement", text: "Les projets et rendez-vous associés au contact complètent le suivi du dossier. Le lien d’accès au portail est personnel : transmettez-le uniquement au destinataire concerné." },
    ],
    questions: [
      { question: "Le client peut-il répondre à un devis en ligne ?", answer: "Oui, lorsqu’un devis a été envoyé et qu’il est ouvert aux réponses, le client peut l’accepter ou le refuser depuis son lien de consultation." },
      { question: "Faut-il diffuser le lien du portail publiquement ?", answer: "Non. Le lien donne accès au dossier du client et doit être partagé uniquement avec le destinataire concerné." },
    ],
  },
] as const;
