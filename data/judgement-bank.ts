/**
 * CURATED JUDGEMENT ITEMS.
 *
 * Every item here is transcribed from the official AGLOA LinguiSHTIK Handbook &
 * Judges Manual, 2026-27 Edition, Section XVIII "Judge's Self-Test" — its 55
 * questions together with the Handbook's own answers and explanations. Nothing
 * is invented: these are the situations AGLOA itself uses to test judges, which
 * makes them exactly the sentence-level cases the shake drills cannot grade
 * (docs/RESEARCH.md §3.2).
 *
 * `minDivision` reproduces the Handbook's asterisks: none = all divisions,
 * `middle` = *, `junior` = **, `senior` = ***. Senior players see all of them.
 */

export type JudgementKind = 'analysis' | 'validation' | 'rule';

export interface JudgementItem {
  id: string;
  kind: JudgementKind;
  /** The solution sentence, or the demand stack for a validation item. */
  sentence: string;
  /** Demands, for validation items (Handbook Section II of the self-test). */
  demands?: string[];
  question: string;
  answer: 'yes' | 'no';
  explanation: string;
  /** Topic keys, used to attribute weakness in the statistics. */
  topics: string[];
  minDivision?: 'middle' | 'junior' | 'senior';
  source: string;
}

const HB = 'Handbook & Judges Manual 2026-27, §XVIII';

export const JUDGEMENT_BANK: JudgementItem[] = [
  {
    id: 'hb-1',
    kind: 'analysis',
    sentence: 'Please give this note to whomever answers the door.',
    question: 'Is whomever used correctly?',
    answer: 'no',
    explanation:
      'You should use "whoever". "Whoever answers the door" is a noun clause functioning as the object of the preposition; whoever is the subject of that clause.',
    topics: ['clause.noun', 'pronoun.relative', 'noun.nominative'],
    source: HB,
  },
  {
    id: 'hb-2',
    kind: 'analysis',
    sentence: 'The stuffed monkey, my present, was wrapped in the Sunday funnies.',
    question: 'Is present in an appositive phrase?',
    answer: 'no',
    explanation:
      'An appositive phrase consists of an appositive and its complements or modifiers. Single determiners, possessive pronouns and demonstrative pronouns do not turn an appositive into an appositive phrase.',
    topics: ['phrase.appositive'],
    source: HB,
  },
  {
    id: 'hb-3',
    kind: 'analysis',
    sentence: 'I want to go fishing with Grandpa next Saturday.',
    question: 'Is this an S-V-DO sentence?',
    answer: 'yes',
    explanation: 'The infinitive phrase "to go fishing with Grandpa next Saturday" functions as the direct object.',
    topics: ['pattern:S-V-DO', 'phrase.infinitive'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-4',
    kind: 'analysis',
    sentence: 'Jack said, "I like apples."',
    question: 'Is this a complex sentence?',
    answer: 'yes',
    explanation:
      '"I like apples" alone is not a noun clause, but the quotation marks turn it into one — they serve as the understood markings for the beginning of a noun clause. An indirect quote would have been preceded by "that" or an understood "that".',
    topics: ['structure:complex', 'quote.direct', 'clause.noun'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-5',
    kind: 'analysis',
    sentence: 'Jimmy shot the deer as soon as it was close enough to his stand.',
    question: 'Is deer plural?',
    answer: 'no',
    explanation:
      'Although deer is both the singular and the plural form, here it is used singularly — we know from the singular pronoun "it" that refers back to it.',
    topics: ['noun.plural', 'noun.singular'],
    source: HB,
  },
  {
    id: 'hb-6',
    kind: 'analysis',
    sentence: 'I enjoy listening to lectures more than working in the lab.',
    question: 'Is working a direct object?',
    answer: 'yes',
    explanation:
      'If the subject in this adverb clause had not been ellipsed we would see it plainly — "I enjoy listening to lectures more than I enjoy working in the lab."',
    topics: ['clause.elliptical', 'function:direct-object'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-7',
    kind: 'analysis',
    sentence: 'The girl baked Martha a cake.',
    question: 'Is cake in an adverb clause?',
    answer: 'no',
    explanation: 'By definition this is a simple sentence — one independent clause. There is no adverb clause.',
    topics: ['clause.adverb', 'structure:simple'],
    source: HB,
  },
  {
    id: 'hb-8',
    kind: 'analysis',
    sentence: 'The girls baked Mother a cake.',
    question: 'Is Mother a proper noun?',
    answer: 'yes',
    explanation:
      'When relationship nouns are used in place of a name, that noun is a proper noun just as a name is. To be a common noun it must be preceded by a determiner or possessive pronoun ("my mother").',
    topics: ['word.properNoun'],
    source: HB,
  },
  {
    id: 'hb-9',
    kind: 'analysis',
    sentence: 'Ahem! You should eat your salad with your salad fork.',
    question: 'Is the interjection properly punctuated?',
    answer: 'yes',
    explanation:
      'An interjection may be punctuated in one of two ways. This is correct because the interjection has an exclamation point after it and the following sentence begins with a capital letter.',
    topics: ['type:interjection', 'sentence.punctuation'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-10',
    kind: 'analysis',
    sentence: 'We expected the girls to win the race.',
    question: 'Is girls in the objective case?',
    answer: 'yes',
    explanation:
      'Girls is the subject of the infinitive clause. The clause functions as the direct object of the sentence, and in that position the subject of an infinitive clause is in the objective case.',
    topics: ['noun.objective', 'clause.infinitive'],
    minDivision: 'junior',
    source: HB,
  },
  {
    id: 'hb-11',
    kind: 'analysis',
    sentence: 'John said, "I can buy that bike because my brother lent me thirty dollars."',
    question: 'Is brother in both a noun clause and an adverb clause?',
    answer: 'yes',
    explanation:
      'The direct quote is a noun clause, and inside it is the adverb clause "because my brother lent me thirty dollars". So brother is in both.',
    topics: ['clause.noun', 'clause.adverb', 'quote.direct'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-12',
    kind: 'analysis',
    sentence: 'One way to raise money is to have a bake sale.',
    question: 'Is this an S-LV-PN sentence?',
    answer: 'yes',
    explanation: 'The infinitive phrase "to have a bake sale" functions as a predicate noun.',
    topics: ['pattern:S-LV-PN', 'phrase.infinitive'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-13',
    kind: 'analysis',
    sentence: '"I picked a bucket of strawberries," said Natasha.',
    question: 'Is this a simple sentence?',
    answer: 'no',
    explanation:
      'The direct quote is a noun clause because it contains a subject and a verb. The sentence therefore has an independent and a dependent clause, making it complex.',
    topics: ['structure:simple', 'structure:complex', 'quote.direct'],
    source: HB,
  },
  {
    id: 'hb-14',
    kind: 'analysis',
    sentence: 'We will borrow the car of my uncle who is eighty.',
    question: 'Is eighty in an adjective phrase?',
    answer: 'yes',
    explanation:
      'The object of the preposition is uncle. Clauses or phrases modifying the object of the preposition are considered part of that prepositional phrase, so the adjective clause "who is eighty" sits inside the adjective phrase "of my uncle".',
    topics: ['phrase.adjective', 'clause.adjective'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-15',
    kind: 'analysis',
    sentence: 'I expected John to choose the captain of the team.',
    question: 'Is captain in an infinitive phrase?',
    answer: 'no',
    explanation:
      '"John to choose the captain of the team" is an infinitive *clause*, not an infinitive phrase. If there is no infinitive phrase, captain cannot be in one.',
    topics: ['phrase.infinitive', 'clause.infinitive'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-16',
    kind: 'analysis',
    sentence: 'Whoever passes the test will get a free day on Friday.',
    question: 'Is test in an adjective clause?',
    answer: 'no',
    explanation: '"Whoever passes the test" is a noun clause functioning as the subject, not an adjective clause.',
    topics: ['clause.adjective', 'clause.noun'],
    source: HB,
  },
  {
    id: 'hb-17',
    kind: 'analysis',
    sentence: 'Class, take out your math books.',
    question: 'Is class the subject of the sentence?',
    answer: 'no',
    explanation: 'The understood "you" is the subject of the imperative sentence. Class is a noun of direct address.',
    topics: ['function:subject', 'purpose:imperative'],
    source: HB,
  },
  {
    id: 'hb-18',
    kind: 'analysis',
    sentence: 'Get quiet so I can hear the announcements.',
    question: 'Is announcements in an imperative sentence?',
    answer: 'yes',
    explanation:
      'Even though announcements sits in a clause that is declarative in nature, the first independent clause is imperative, and the purpose is met if any independent clause meets it.',
    topics: ['purpose:imperative'],
    source: HB,
  },
  {
    id: 'hb-19',
    kind: 'rule',
    sentence: 'Did you study for your Geography test?',
    question: 'Should geography be capitalized?',
    answer: 'no',
    explanation: 'Names of subjects are capitalised only if followed by a number, unless the subject is the name of a language.',
    topics: ['sentence.capitalisation'],
    source: HB,
  },
  {
    id: 'hb-20',
    kind: 'analysis',
    sentence: 'The word occur is difficult to spell.',
    question: 'Is occur an appositive?',
    answer: 'no',
    explanation:
      'Occur is in apposition to word, but an appositive is by definition a noun, and occur does not appear in the dictionary as a noun, so it cannot be an acceptable appositive.',
    topics: ['function:appositive', 'word.dictionary'],
    source: HB,
  },
  {
    id: 'hb-21',
    kind: 'analysis',
    sentence: 'The house where I was born is still standing.',
    question: 'Is born in an adjective clause?',
    answer: 'yes',
    explanation: 'Adjective clauses usually begin with relative pronouns but may also begin with relative adverbs; "where" is one of those.',
    topics: ['clause.adjective'],
    source: HB,
  },
  {
    id: 'hb-22',
    kind: 'analysis',
    sentence: 'The boy, that one standing against the bleachers, is cute.',
    question: 'Is that a relative pronoun?',
    answer: 'no',
    explanation: 'Relative pronouns introduce subordinate clauses. Here "that" is being used as an adjective modifying "one".',
    topics: ['pronoun.relative', 'type:adjective'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-23',
    kind: 'analysis',
    sentence: 'I know where you live.',
    question: 'Is live in a noun clause?',
    answer: 'yes',
    explanation: '"Where you live" is a noun clause introduced by a relative adverb; the clause functions as a direct object.',
    topics: ['clause.noun'],
    source: HB,
  },
  {
    id: 'hb-24',
    kind: 'analysis',
    sentence: 'She sounds like she wants to come with us.',
    question: 'Is like a preposition?',
    answer: 'no',
    explanation:
      'Here "like" is a subordinate conjunction introducing the adjective clause "like she wants to come with us" — the dictionary gives it a separate entry as a conjunction. The clause functions as a predicate adjective.',
    topics: ['type:preposition', 'type:conjunction', 'clause.adjective'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-25',
    kind: 'analysis',
    sentence: 'They were given a million dollars.',
    question: 'Is dollars a retained direct object?',
    answer: 'yes',
    explanation:
      'With a passive voice verb, any complements are retained objects. Rewriting actively — "He gave them a million dollars" — shows dollars is a direct object, so retained it becomes a retained direct object.',
    topics: ['function:retained-do', 'verb.passiveVoice'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-26',
    kind: 'analysis',
    sentence: 'He put off the decision until a later date.',
    question: 'Is decision a direct object?',
    answer: 'yes',
    explanation:
      'Decision is the direct object of the verb "put off", which contains a verb particle. "Off" here is a verb particle rather than a preposition.',
    topics: ['function:direct-object', 'verb.particle'],
    source: HB,
  },
  {
    id: 'hb-27',
    kind: 'analysis',
    sentence: 'He gave whoever wanted the papers that were stored in the warehouse a key.',
    question: 'Is warehouse in a noun clause?',
    answer: 'yes',
    explanation:
      'The whole noun clause is "whoever wanted the papers that were stored in the warehouse", functioning as the indirect object. Warehouse is also inside the adjective clause "that were stored in the warehouse".',
    topics: ['clause.noun', 'clause.adjective'],
    source: HB,
  },
  {
    id: 'hb-28',
    kind: 'analysis',
    sentence: 'We listened to the music.',
    question: 'Is music a direct object?',
    answer: 'yes',
    explanation: '"Listen to" contains a verb particle, so music is a direct object rather than an object of the preposition.',
    topics: ['function:direct-object', 'verb.particle'],
    source: HB,
  },
  {
    id: 'hb-29',
    kind: 'analysis',
    sentence: 'He handed the scissors case to Myron.',
    question: 'Is scissors a noun used as adjective that is plural?',
    answer: 'no',
    explanation:
      'There is no such thing as a plural noun used as adjective: nouns used as adjectives function as adjectives, and adjectives have no number.',
    topics: ['function:noun-as-adjective', 'noun.plural'],
    source: HB,
  },
  {
    id: 'hb-30',
    kind: 'analysis',
    sentence: 'He yelled, "Joey!"',
    question: 'Is this a complex sentence?',
    answer: 'no',
    explanation:
      'For a direct or indirect quote to be a noun clause it must contain a subject and a verb. This one-word quote has neither, so it is not a clause.',
    topics: ['structure:complex', 'quote.direct'],
    source: HB,
  },
  {
    id: 'hb-31',
    kind: 'analysis',
    sentence: 'Help! I have fallen and cannot get up.',
    question: 'Is help an interjection?',
    answer: 'yes',
    explanation:
      'Although help is a verb, the official dictionary states it is often used interjectionally, and here it is properly punctuated as an interjection.',
    topics: ['type:interjection'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-32',
    kind: 'analysis',
    sentence:
      'While considering running for class president, the student who had never been popular realized that he would not overcome his handicap.',
    question: 'Is this an S-V sentence?',
    answer: 'no',
    explanation:
      'The pattern is S-V-DO: student — realized — that he would not overcome his handicap. "While considering…president" is an elliptical clause and "who had never…popular" an adjective clause; neither affects the pattern.',
    topics: ['pattern:S-V', 'pattern:S-V-DO', 'clause.elliptical'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-33',
    kind: 'analysis',
    sentence: 'While proofreading the manuscript to be published, the editor fell asleep.',
    question: 'Is "manuscript to be published" an infinitive clause?',
    answer: 'no',
    explanation:
      'Manuscript is the direct object of the verb "proofreading" in an elliptical clause, and "to be published" is an infinitive phrase functioning as an adjective modifying manuscript.',
    topics: ['clause.infinitive', 'phrase.infinitive', 'clause.elliptical'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-34',
    kind: 'rule',
    sentence: 'In the book, the purple cow gave purple milk.',
    question: 'Is this sentence based on reality?',
    answer: 'no',
    explanation:
      'LT 23 A prohibits sentences justified by "in the book", "in my dream", "in the movie" and the like. The reality must come from the sentence itself.',
    topics: ['sentence.reality'],
    source: HB,
  },
  {
    id: 'hb-35',
    kind: 'rule',
    sentence: 'You go to the store.',
    question: 'Is this an imperative sentence?',
    answer: 'no',
    explanation:
      'Without a comma after "you" the sentence reads as declarative. Had the player set off "you" with a comma it would clearly be a noun of direct address and the ruling would be yes.',
    topics: ['purpose:imperative', 'sentence.punctuation'],
    source: HB,
  },
  {
    id: 'hb-36',
    kind: 'rule',
    sentence: 'I went to the store yesterday!',
    question: 'Is this an exclamatory sentence?',
    answer: 'yes',
    explanation:
      'Accept as exclamatory any non-imperative sentence written with an exclamation mark, rather than arguing about how much emotion it shows.',
    topics: ['purpose:exclamatory'],
    source: HB,
  },
  {
    id: 'hb-37',
    kind: 'analysis',
    sentence: 'The boy cried, "Hooray!"',
    question: 'Is hooray an interjection?',
    answer: 'no',
    explanation:
      'The dictionary lists hooray as a variant of hurrah, so it is listed as an interjection — but an interjection has no grammatical connection to the sentence, and here hooray is the direct object.',
    topics: ['type:interjection', 'function:direct-object'],
    source: HB,
  },
  {
    id: 'hb-38',
    kind: 'analysis',
    sentence: 'Buying a woman perfume is always a tricky venture.',
    question: 'Is woman an indirect object?',
    answer: 'yes',
    explanation: 'Woman is the indirect object of the gerund phrase "buying…perfume", which functions as the subject of the sentence.',
    topics: ['function:indirect-object', 'phrase.gerund'],
    minDivision: 'junior',
    source: HB,
  },
  {
    id: 'hb-39',
    kind: 'analysis',
    sentence: 'We were given a chance to bid on the painting.',
    question: 'Is the verb in the simple past tense?',
    answer: 'yes',
    explanation: '"Were given" is the passive voice of the simple past. In the active voice it would be "He gave us a chance".',
    topics: ['verb.simpleTense', 'verb.passiveVoice'],
    source: HB,
  },
  {
    id: 'hb-40',
    kind: 'analysis',
    sentence: 'John said that the doctor is a great man.',
    question: 'Is doctor contained in an indirect quote?',
    answer: 'yes',
    explanation:
      'An indirect quote does not give the speaker\'s exact words but conveys the message. John\'s message is that the doctor is a great man.',
    topics: ['quote.indirect'],
    minDivision: 'junior',
    source: HB,
  },
  {
    id: 'hb-41',
    kind: 'analysis',
    sentence: 'The boy is handsome.',
    question: 'Is handsome a noun modifier?',
    answer: 'yes',
    explanation: 'In all divisions a predicate adjective is accepted as a noun modifier.',
    topics: ['function:noun-modifier', 'function:predicate-adjective'],
    source: HB,
  },
  {
    id: 'hb-42',
    kind: 'analysis',
    sentence: 'Help me finish this project.',
    question: 'Is project a direct object?',
    answer: 'yes',
    explanation: 'Project is the direct object of the bare infinitive — an infinitive whose "to" is omitted.',
    topics: ['function:direct-object', 'function:infinitive'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-43',
    kind: 'analysis',
    sentence: 'Gloria was elected president.',
    question: 'Is president a retained objective complement?',
    answer: 'yes',
    explanation:
      'Returned to the active voice, president is plainly an objective complement; transforming into the passive voice retains it as an object.',
    topics: ['function:retained-oc', 'verb.passiveVoice'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-44',
    kind: 'analysis',
    sentence: 'Comedy usually becomes more common during times of despair.',
    question: 'Is common a comparative adjective?',
    answer: 'yes',
    explanation:
      'The word common uses "more" as its identifier, making it comparative. It is a predicate adjective modifying comedy.',
    topics: ['adjective.comparative'],
    source: HB,
  },
  {
    id: 'hb-45',
    kind: 'analysis',
    sentence: 'Considering refusing the appointment was unthinkable to most of his friends.',
    question: 'Is refusing contained in a participial phrase?',
    answer: 'no',
    explanation:
      'Refusing is a gerund beginning the gerund phrase "refusing the appointment", which functions as the direct object of "considering…the appointment" — a gerund phrase inside a gerund phrase.',
    topics: ['phrase.participial', 'phrase.gerund'],
    minDivision: 'junior',
    source: HB,
  },
  {
    id: 'hb-46',
    kind: 'analysis',
    sentence: 'We will buy the car, only you must agree to pay for the insurance.',
    question: 'Is this a compound sentence?',
    answer: 'yes',
    explanation:
      '"Only" has a separate dictionary listing meaning "but", a coordinating conjunction. It is also defined as meaning "except", a subordinating conjunction, so a complex reading would be acceptable too.',
    topics: ['structure:compound', 'type:conjunction'],
    source: HB,
  },
  {
    id: 'hb-47',
    kind: 'analysis',
    sentence: 'While buying parts for his car, the boy remembered he needed an oil filter.',
    question: 'Is parts contained in a participial phrase?',
    answer: 'no',
    explanation:
      'Parts is the direct object in an elliptical clause — "the boy was" is easily understood between "while" and "buying".',
    topics: ['phrase.participial', 'clause.elliptical'],
    minDivision: 'senior',
    source: HB,
  },
  {
    id: 'hb-48',
    kind: 'analysis',
    sentence: 'While buying parts for his car, the boy remembered he needed an oil filter.',
    question: 'Is filter contained in a noun clause?',
    answer: 'yes',
    explanation: '"He needed an oil filter" is a noun clause functioning as the direct object of remembered; the introductory "that" has been omitted.',
    topics: ['clause.noun'],
    source: HB,
  },
  {
    id: 'hb-49',
    kind: 'validation',
    sentence: 'The president who signed the treaty, in an effort to make peace, kept a solemn expression.',
    demands: ['S-V-DO', 'NOUN', 'APPOSITIVE'],
    question: 'Does this solution meet all of the demands? (the formed word is effort)',
    answer: 'no',
    explanation:
      'Effort is the object of the preposition "in", not an appositive. For effort to be an appositive the sentence would need to read "The president who signed the treaty, an effort to make peace, kept a solemn expression."',
    topics: ['function:appositive', 'function:object-of-preposition'],
    source: HB,
  },
  {
    id: 'hb-50',
    kind: 'validation',
    sentence: 'The boy said, "Looking in the window gives me the creeps."',
    demands: ['SIMPLE', 'NOUN', 'OBJECT OF PREPOSITION', 'SINGULAR'],
    question: 'Does this solution meet all of the demands? (the formed word is window)',
    answer: 'no',
    explanation:
      'It fails the first demand. The direct quote contains a subject and a verb, so it is a dependent noun clause, making the sentence complex rather than simple.',
    topics: ['structure:simple', 'quote.direct'],
    source: HB,
  },
  {
    id: 'hb-51',
    kind: 'validation',
    sentence: 'We expect the geese to chase the ducks.',
    demands: ['S-V-DO', 'NOUN', 'DIRECT OBJECT', 'PLURAL', 'NO "S"'],
    question: 'Does this solution meet all of the demands? (the formed word is geese)',
    answer: 'no',
    explanation:
      'Two failures. The formed word contains an "s", and geese is not a direct object — it is the subject of the infinitive clause that functions as the direct object.',
    topics: ['function:direct-object', 'clause.infinitive', 'gen.mustNotContain'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-52',
    kind: 'validation',
    sentence: 'Consume you anger will, as it has consumed others.',
    demands: ['INVERTED', 'VERB', 'SIMPLE FUTURE', '7 LETTERS'],
    question: 'Does this solution meet all of the demands? (the formed word is consume)',
    answer: 'yes',
    explanation:
      'An inverted sentence has a subject appearing after the predicate or between its parts. The subject "anger" appears between "will" and "consume".',
    topics: ['pattern:INVERTED', 'verb.simpleTense', 'gen.numberOfLetters'],
    source: HB,
  },
  {
    id: 'hb-53',
    kind: 'validation',
    sentence: 'The audience applauded because the choir sang so well.',
    demands: ['S-V-DO', 'NOUN', 'SUBJECT', 'SINGULAR'],
    question: 'Does this solution meet all of the demands? (the formed word is audience)',
    answer: 'no',
    explanation: 'Wrong from the start — the sentence produced has an S-V pattern, not S-V-DO.',
    topics: ['pattern:S-V-DO', 'pattern:S-V'],
    source: HB,
  },
  {
    id: 'hb-54',
    kind: 'validation',
    sentence: 'We expect the girls to win the matches since they are on a winning streak.',
    demands: ['COMPLEX', 'NOUN', 'DIRECT OBJECT', 'IN INFINITIVE PHRASE', 'PLURAL'],
    question: 'Does this solution meet all of the demands? (the formed word is matches)',
    answer: 'no',
    explanation:
      'Matches is contained within an infinitive *clause*, not an infinitive phrase. "The girls to win the matches" functions as the direct object of expect.',
    topics: ['phrase.infinitive', 'clause.infinitive'],
    minDivision: 'middle',
    source: HB,
  },
  {
    id: 'hb-55',
    kind: 'validation',
    sentence: 'Giving my mother the cake, I left the reception because I was not feeling well.',
    demands: ['S-V-DO', 'NOUN', 'INDIRECT OBJECT', 'NOT IN GERUND PHRASE'],
    question: 'Does this solution meet all of the demands? (the formed word is mother)',
    answer: 'yes',
    explanation:
      'Mother is the indirect object of the participle "giving"; the participial phrase modifies the "I" functioning as the subject of the independent clause.',
    topics: ['function:indirect-object', 'phrase.participial', 'not.in'],
    minDivision: 'junior',
    source: HB,
  },
];

/**
 * RULE-KNOWLEDGE ITEMS.
 *
 * Multiple-choice items whose answers are read straight out of the Tournament
 * Rules and Scoring Chart. Every option carries the rule number so a wrong
 * answer teaches the citation, not just the fact.
 */
export interface RuleItem {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topics: string[];
  source: string;
}

export const RULE_BANK: RuleItem[] = [
  {
    id: 'rule-challenge-now-cubes',
    question: 'You call Challenge Now. How many cubes may you take from Resources to write your solution?',
    options: ['None', 'One, if you need it', 'Two', 'As many as you need'],
    correct: 1,
    explanation:
      'LT 19 A — one more cube from Resources if needed. It may be a letter, or a black/green cube used to make one additional Demand, which must be written with the solution.',
    topics: ['rule:challenge-now'],
    source: 'LT 19 A, LT 20 A',
  },
  {
    id: 'rule-challenge-now-minimum',
    question: 'Only two cubes are in LETTERS and you call Challenge Now. What happens?',
    options: [
      'The challenge stands',
      'You take a −1 penalty, lose your turn, and the challenge is set aside',
      'You take a −1 penalty but the challenge stands',
      'Play simply continues with no penalty',
    ],
    correct: 1,
    explanation: 'LT 13 A5 and LT 18 — Challenge Now needs at least three cubes in Letters.',
    topics: ['rule:challenge-now', 'rule:penalties'],
    source: 'LT 13 A5, LT 18',
  },
  {
    id: 'rule-impossible-solver',
    question: 'Challenge Impossible is called. Who must write a solution?',
    options: ['The challenger', 'The Mover', 'Every player', 'Nobody — the shake ends'],
    correct: 1,
    explanation:
      'LT 20 B — the challenger may not write a solution; the Mover must, using as many letters from Letters and Resources as needed but making no further Demands. The third party may solve or go Neutral.',
    topics: ['rule:challenge-impossible'],
    source: 'LT 19 B, LT 20 B',
  },
  {
    id: 'rule-impossible-scoring',
    question: 'Challenge Impossible is called and nobody writes a correct solution. What does the challenger score?',
    options: ['2', '4', '6', '0'],
    correct: 2,
    explanation: 'Scoring Chart situation D — the challenger scores 6, Neutral players 4, and the Mover 2.',
    topics: ['rule:scoring'],
    source: 'Scoring Chart, situation D',
  },
  {
    id: 'rule-forceout',
    question: 'All three players have used their PASS. What happens next?',
    options: [
      'The shake is scored 0 for everyone',
      'Forceout: three minutes to solve using two more cubes from Resources',
      'Player One rerolls',
      'The last mover must solve alone',
    ],
    correct: 1,
    explanation:
      'LT 24 — Forceout gives three minutes and two more Resources cubes, neither of which may be used as a Demand. A correct solution scores 4, an incorrect or missing one scores 2.',
    topics: ['rule:forceout'],
    source: 'LT 24',
  },
  {
    id: 'rule-pass-count',
    question: 'How many times may one player call PASS in a single shake?',
    options: ['Once', 'Twice', 'As often as they like', 'Never — PASS is not a Senior move'],
    correct: 0,
    explanation: 'LT 24 1 C — each player may PASS once per shake and must initial the List of Demands Form to show it has been used.',
    topics: ['rule:pass'],
    source: 'LT 24',
  },
  {
    id: 'rule-duplicate-demand',
    question: 'A player calls "must contain E" when "must contain A" is already in force. What is that?',
    options: [
      'A legal additional demand',
      'Illegal Procedure, no penalty if corrected',
      'A Duplicate Demand: −1 and the demand must be corrected',
      'A Challenge Impossible situation',
    ],
    correct: 2,
    explanation:
      'LT 16 B allows only one letter to be demanded per shake, and LT 13 B2 lists MUST CONTAIN among the Duplicate Demands, which carry a −1 penalty.',
    topics: ['rule:duplicate-demand', 'gen.mustContain'],
    source: 'LT 13 B2, LT 16 B',
  },
  {
    id: 'rule-clause-phrase-limit',
    question: 'How many times in one Senior shake may a player demand that the word be contained in a clause or a phrase?',
    options: ['Once', 'Twice in total', 'Twice for clauses and twice for phrases', 'No limit'],
    correct: 1,
    explanation:
      'LT 16 M & N — two in total: two clauses, two phrases, or one of each. LT 16 Q additionally allows one "must NOT be contained in".',
    topics: ['rule:limits', 'clause.noun', 'phrase.gerund'],
    source: 'LT 16 M, N, Q',
  },
  {
    id: 'rule-word-length',
    question: 'What lengths may the word to be formed be?',
    options: ['3–8 letters', '4–10 letters', '4–8 letters', 'Any length'],
    correct: 1,
    explanation: 'LT 2 — the object of the game is to make a 4 to 10 letter word using cubes from the game mat.',
    topics: ['rule:word'],
    source: 'LT 2',
  },
  {
    id: 'rule-archaic',
    question: 'The word you want is labelled "archaic" in the official dictionary. May you use it?',
    options: ['Yes', 'No — archaic words are barred', 'Only with the judge\'s permission', 'Only in Senior Division'],
    correct: 0,
    explanation: 'LT 22 B — a word may not be labelled obsolete, but a word labelled archaic may be used.',
    topics: ['rule:word', 'word.dictionary'],
    source: 'LT 22 B',
  },
  {
    id: 'rule-dictionary',
    question: 'Which dictionary is the final authority during competition?',
    options: [
      "Merriam-Webster's Collegiate",
      "Webster's Third New International Unabridged, online at dictionary.eb.com",
      'The Oxford English Dictionary',
      "Any dictionary the host provides",
    ],
    correct: 1,
    explanation: "LT 4 — Webster's Third International Unabridged; during competition only the current online unabridged version at dictionary.eb.com is referenced.",
    topics: ['rule:references'],
    source: 'LT 4',
  },
  {
    id: 'rule-grammar-reference',
    question: 'Which grammar is the primary reference for LinguiSHTIK?',
    options: [
      'The Plain English Handbook',
      'Prentice-Hall Grammar and Composition',
      'Elements of Language, 6th Course (Holt Rinehart Winston)',
      'The Handbook and Judges Manual',
    ],
    correct: 2,
    explanation:
      'LT 4 — Elements of Language, 6th Course is the primary reference; Prentice-Hall and The Plain English Handbook are secondary sources.',
    topics: ['rule:references'],
    source: 'LT 4',
  },
  {
    id: 'rule-retained-voice',
    question: 'A Senior shake designates S-V-Retained DO. What must be true of the verb?',
    options: ['It must be a linking verb', 'It must be in the passive voice', 'It must be an infinitive', 'It must be in the perfect tense'],
    correct: 1,
    explanation:
      'Handbook II.A — retained objects are found only in sentences written in the passive voice, so patterns 9–12 all require it.',
    topics: ['pattern:S-V-RET-DO', 'verb.passiveVoice'],
    source: 'HB II.A note, LT 6',
  },
  {
    id: 'rule-player-one-impossible',
    question: 'Player One looks at Resources and believes no solution exists at all. What may they do?',
    options: [
      'Nothing — they must designate a sentence type',
      'Call Challenge Impossible instead of designating',
      'Reroll the cubes',
      'Pass',
    ],
    correct: 1,
    explanation:
      'LT 25 — Player One may call CHALLENGE IMPOSSIBLE instead of calling a pattern, structure or purpose, challenging the shake rather than a mover. If nobody can solve, all players score 0.',
    topics: ['rule:challenge-impossible'],
    source: 'LT 25',
  },
  {
    id: 'rule-interjection-function',
    question: 'Player Two demands INTERJECTION. What does Player Three do?',
    options: [
      'Makes a Function Demand from the interjection list',
      'Puts a cube in Letters or makes a General Demand',
      'Calls Challenge Impossible',
      'Passes',
    ],
    correct: 1,
    explanation:
      'Senior Order of Play — interjection has no function demands, so Player Three plays a cube to Letters or makes a Demand (LT 10).',
    topics: ['type:interjection', 'rule:order-of-play'],
    source: 'Sr OOP, LT 10',
  },
  {
    id: 'rule-color-wild',
    question: 'Yellow is declared wild. What can two yellow cubes represent?',
    options: [
      'The same single letter only',
      'Any two letters, and they need not be the same',
      'Only vowels',
      'Nothing — wild cubes cannot be used in the word',
    ],
    correct: 1,
    explanation:
      'LT 16 A — cubes of the wild colour may represent a single letter more than once, or may represent different letters. Only one colour may be wild in a shake.',
    topics: ['gen.colorWild'],
    source: 'LT 16 A',
  },
  {
    id: 'rule-letter-transfer',
    question: '"All P\'s are X\'s" is demanded. What happens to a wild cube a player wanted to call a P?',
    options: ['It stays a P', 'It becomes an X', 'It becomes unusable', 'The demand does not apply to wild cubes'],
    correct: 1,
    explanation: 'LT 16 D — P is entirely eliminated from the shake; even a wild cube designated a "p" becomes an "x".',
    topics: ['gen.letterTransfer', 'gen.colorWild'],
    source: 'LT 16 D',
  },
  {
    id: 'rule-double-vowel',
    question: 'DOUBLE VOWEL is demanded. Which word satisfies it?',
    options: ['queue', 'praise', 'balloon', 'audio'],
    correct: 2,
    explanation:
      'LT 16 F — the word must contain two consecutive vowels of the *same* letter (ee, oo, aa). Only balloon has one.',
    topics: ['gen.doubleVowel'],
    source: 'LT 16 F',
  },
  {
    id: 'rule-compound-preposition',
    question: 'COMPOUND is demanded and the Type Demand is preposition. What must the player produce?',
    options: [
      'A two-word compound preposition such as "because of"',
      'A preposition that is itself a compound word, such as "within"',
      'Any preposition',
      'Nothing — the combination is illegal',
    ],
    correct: 1,
    explanation:
      'Handbook VII.A note — compound does not mean "compound preposition" (two separate words); the player must use a preposition that is a compound word: into, upon, within, without.',
    topics: ['word.compound', 'type:preposition'],
    source: 'HB VII.A, DoT',
  },
  {
    id: 'rule-round-end',
    question: 'The 30-minute round expires, the five extra minutes run out, and no challenge has been made. What happens?',
    options: [
      'The shake is scored 0 for everyone',
      'Each player has three minutes to write a sentence using any cubes remaining in Resources; correct scores 4, otherwise 2',
      'The shake continues until someone challenges',
      'The player with the most cubes in Letters wins the shake',
    ],
    correct: 1,
    explanation: 'LT 26 1 — play stops, three minutes to write, 4 points for a correct solution and 2 for an incorrect or missing one.',
    topics: ['rule:round-end', 'rule:scoring'],
    source: 'LT 26',
  },
  {
    id: 'rule-four-ahead',
    question:
      'A player four points ahead at the five-minute warning calls Challenge Now, and no one has a correct solution. What does a Neutral player score?',
    options: ['2', '4', '6', '0'],
    correct: 2,
    explanation: 'LT 26 #3 and Scoring Chart situation C — any Neutral player receives 6 instead of the usual 4.',
    topics: ['rule:scoring'],
    source: 'LT 26 #3, Scoring Chart C',
  },
  {
    id: 'rule-absent',
    question: 'A player is absent for a shake. What do they score?',
    options: ['0', '−1', '−2', '2'],
    correct: 2,
    explanation: 'LT 34 — a player who is absent for a shake scores −2 for that shake.',
    topics: ['rule:penalties'],
    source: 'LT 34',
  },
  {
    id: 'rule-time-solution',
    question: 'How long does a player have to write a solution, and may they take a −1 to buy more time?',
    options: [
      'Three minutes, and no — buying time is forbidden',
      'Three minutes, and yes, for −1 per extra minute',
      'One minute, and no',
      'Two minutes, and yes',
    ],
    correct: 0,
    explanation: 'LT 13 A4 — three minutes, and a player may not take a −1 penalty in order to add a minute to the solution-writing time.',
    topics: ['rule:timing'],
    source: 'LT 13 A4',
  },
  {
    id: 'rule-challenge-self',
    question: 'You just placed a cube in Letters and immediately see a solution. May you call Challenge Now?',
    options: ['Yes', 'No — you made the last move', 'Only if three cubes are in Letters', 'Only in Senior Division'],
    correct: 1,
    explanation: 'LT 18 — a player may never challenge if they made the last move; challenging yourself is an invalid challenge and costs −1.',
    topics: ['rule:challenge-now'],
    source: 'LT 18',
  },
];
