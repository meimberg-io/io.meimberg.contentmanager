# Seed - Product Mission 

_Dies ist ein unstrukturierter Seed aus einem Voice-Transkript, der die eigentliche Produktmission definiert._

_29.6.2026, Oliver Meimberg_

---

Es gibt jetzt eine Mission. Das Ding, in dessen Repo wir gerade sitzen, heißt hier im Repo „Content Manager“. Inzwischen nenn ich es SmartEditor.

Es ist entstanden als kleines Tool, mit dem ich Blogbeiträge schreiben kann. Ich kann dort ein Seed hineinwerfen, also eine Voice Message zum Beispiel oder irgendwas Zusammengescriptetes, und er macht mir daraus einen Blogbeitrag. Außerdem wird ein Bild generiert und verschiedenste Metadaten, so wie dieser Text, Abstract und so weiter.

Das war die ursprüngliche Basis. Es hat hervorragend funktioniert, so habe ich einige sehr schöne Blogbeiträge geschrieben.

Nun gab es weitere Entwicklungen, und zwar genau genommen zwei, die voneinander abzweigten. Meinen SmartEditor habe ich irgendwann erweitert, so dass er zu jedem Blogbeitrag auch einen LinkedIn-Post veröffentlichen kann. Der LinkedIn-Post hat dann einen eigenen Text und verweist dann natürlich auf den Verknüpften Blogbeitrag. Ich kann auch Blog-Beiträge ohne LinkedIn-Post veröffentlichen, und ich kann auch LinkedIn-Posts ohne Blog-Beitrag veröffentlichen. Technisch, architektonisch ist das, glaube ich, noch nicht so richtig sauber aufgesetzt, aber egal. Parallel gab es noch eine Entwicklung, wo ich eine Demo-Version für den ZDB gebaut habe. Der ZDB ist der Zentralverband des Deutschen Baugewerbes, und der möchte auch aus einem Eingangstext verschiedene Formate generieren:

\- eine Rundschreiben für die Verbandsmitglieder

\- eine Pressemitteilung

\- einen LinkedIn-Beitrag

\- eine WhatsApp-Meldung

\- eine Pressemitteilung an den Spiegel

\- eine Pressemitteilung an Springer und so weiter

Alle Formate haben unterschiedliche Längen und unterschiedliche Tonalitäten und so weiter. Also auch Multichannel-Publishing. Die Idee ist ähnlich. Das Tool ist quasi vom Kern das Gleiche. Die Ausprägung der verschiedenen Kanäle ist natürlich eine ganz andere.

Die Mission ist jetzt folgende: Ich glaube, man kann aus dem Ding ein Produkt machen. Ich möchte gerne eine Produktdefinition jetzt erstellen. Und dazu gebe ich jetzt mal einige Wünsche und Constraints in loser Folge mit. Wir müssen dann eine fachliche Produktbeschreibung erzeugen und möglicherweise auch schon eine Basisarchitektur.

Der Kern beider Systeme ist der gleiche. Aus einem Seed oder einem Intake können unterschiedliche Textformate generiert werden: in hoher Qualität, mit sehr gut festgezurrter Sprachlichkeit. Grundsätzlich muss das Produkt unterschiedliche Kanäle bedienen können. Das heißt, jeder Kunde hat eine völlig individuelle Liste von Kanälen. Die Kanäle müssen also frei anpassbar sein. Ob jetzt direkt per Oberfläche, weiß ich nicht. Wahrscheinlich schon. 

Ein Kanal definiert sich natürlich zum einen aus seinem Content. Was für Content muss erzeugt werden? Das ist in der Regel erstmal der Haupttext. Der ist bei einem Blogbeitrag natürlich vollkommen anders als bei einem LinkedIn-Post. Plus zusätzliche Metadaten. LinkedIn-Post hat zum Beispiel möglicherweise Tags. Der Blogpost nicht unbedingt. Dafür hat der Blogpost ein Header-Bild, der LinkedIn-Beitrag vielleicht nicht oder auch doch. 

Einige dieser Eigenschaften könnten sich die Formate teilen, so was wie ein Bild. Das Bild wird dann für LinkedIn benutzt, genauso wie für den Blogpost, nicht allerdings für WhatsApp. Andere haben möglicherweise individuelle Eigenschaften, weil ich vielleicht bei LinkedIn auch andere Tags habe als bei X.

Weiterhin habe ich inzwischen eine Scheduling-Funktion, ähnlich wie bei Publer. Ich kann also sogenannte Slots definieren, in denen dann die Posts abgeschickt werden. Das muss auf jeden Fall beibehalten und vermutlich weiter ausgebaut werden.

Das Produkt: Die Kanäle unterscheiden sich einmal aus dem Content und einmal natürlich aus dem Zielformat beziehungsweise der Publikation für jeden Kanal. Für jeden Kanal brauche ich natürlich ganz spezifische Prompts, die den Content erzeugen, vielleicht sogar Agents oder Skills oder so was. Weiß nicht, wahrscheinlich nur Prompts, weil unterschiedliche Tonalitäten erzeugt werden müssen, aber vermutlich gibt es einen übergeordneten Redakteurs-Prompt, der den Mehrwert im Kern des Systems aufbildet, der natürlich geheim ist.

Weiterhin gibt es dann das Format, in dem das Ganze entsteht. LinkedIn zum Beispiel ist normaler Text. Meine Blogbeiträge sind beispielsweise Markdown. Anderes ist möglicherweise HTML, vielleicht sogar eine bestimmte Ausprägung, also mit einer bestimmten Semantik von Tags oder Klassen. Theoretisch sind weitere Formate denkbar, wie JSON oder so.

Bin mir nicht sicher, ob man im Content nicht auf Markdown reduziert. Man reduziert sich auf Markdown, der lässt sich natürlich dann später in HTML überführen. Ich glaube, so weit würde ich jetzt erstmal gehen. Content reduziert man sich auf Markdown. MarkDown kann ich jederzeit zu HTML transformieren, und auch JSON umgekehrt nicht unbedingt. Text ist Text. Das heißt, diese beiden Zielformate gibt es eigentlich für die Felder.

Okay, das sind die Formate. Natürlich muss Markdown auch sowas wie Code Sections haben und Tabellen, aber das funktioniert eigentlich schon ganz gut, jedenfalls in meinem SmartEditor, in meinem persönlichen, der gegenüber der zdb-Variante schon etwas ausgereifter ist, weil die halt irgendwann vor einiger Zeit mal geforkt wurden.

Jetzt gibt es die Kanäle, also das eigentlich Publishing, so was Publer anbietet. LinkedIn ist sicherlich einer. Meine Website publiziert auf Storyblok. Der erste Fehler in dem System, wenn man es eher generisch betrachtet, ist, dass auch die primäre Persistenz dieses Tools auf Storyblok sitzt, weil es mal so gedacht worden war, was auf jeden Fall passieren muss. Was auf jeden Fall passieren muss, ist, dass die primäre Persistenz für jeden einzelnen Beitrag erst mal in einer lokalen Datenbank ist, also zum Beispiel in Supabase. Von dort aus wird es dann gepublished, zum Beispiel zu Storyblok oder zu LinkedIn oder zu WordPress oder zu X oder zu Facebook und so weiter. Das ist auf jeden Fall eine große architektonische Änderung, die wir machen müssen, aber das ist kein großes Problem, weil dafür haben wir unsere Agenten. 

Nun also noch mal zu den Kanälen. Es soll also verschiedene Kanäle geben und die müssen irgendwie auch erweiterbar sein. Die eigentlichen Kanäle werden dann vermutlich per Code erweiterbar. Das heißt wenn jemand einen Kanal haben möchte, dann kann er den anmelden und dann baue ich den schnell. Der Kanal sollte so definiert sein, dass er im Prinzip ein klares Interface implementiert, wenn man so möchte, sodass die Implementierung wirklich eine reine Implementierungssache ist, was die Agenten machen können, ohne dass man groß über Architektur nachdenkt. Dazu brauchen die Zielsysteme in irgendeiner Form eine API oder wir müssen einen anderen Adapter bauen. Das heißt: Jedes Zielsystem hat im Prinzip einen Adapter. Bei der Gelegenheit könnte man klären, ob die LinkedIn-Posts wirklich über Pabla laufen müssen oder ob ich die nicht direkt in die API schicke. Der Einfachheit halber mache ich das im Moment über Pabla. Auch muss übrigens geklärt werden, ob Pabla mir im Moment mehr Werte bietet, die ich dann nicht mehr hätte, so was wie Auswertung der Klicks oder so. Das ist ein anderes Thema, gehört aber mit in den Seed. 

Jetzt kurz mal den Blick auf die Produktebene und den Betrieb. Der Kern der Software sollte nicht forken. Das ist erst mal wichtig. Das heißt: Wenn ich jetzt wirklich ein Produkt daraus mache, was ich verkaufe, sollte es ein Produkt sein und nicht 25 verschiedene Versionen, weil ich bereits das vom ZDB jetzt nicht mehr eingefangen bekomme.

Das heißt das allererste, was wir tun müssten, wäre ein Produkt zu bauen, das Channel- und Zielsystem-agnostisch ist. Was also gleichzeitig meinen Blog und LinkedIn-Journey oder aber auch die Journey für den ZDB mit ihren Umverbandsrundschreiben und so weiter bedient. Ähnlich wie in Pabla muss ich dann verschiedene Channels anlegen können und Prompts für jeden Channel und vielleicht noch ein paar mehr Sachen. Dann gibt es Publishing-Methoden für jeden Channel. Das einfachste ist natürlich das Erzeugen von Markdown zum Download oder auch Word oder PDF.

Bei Word/PDF stellt sich noch die Frage nach dem Branding. Vermutlich sollte es so sein, dass Word immer generiert wird. Wenn WDF gebraucht wird, wird PDF aus dem Word erzeugt und dann könnte ich theoretisch mit einer standardisierten Word-Vorlage arbeiten, die die Kunden sich einmal zurechtbasteln und hochladen können oder so. Möglicherweise gehe ich sogar auf Open Document Format zurück, weil es einfach besser ist und durch Word und durch LibreOffice erzeugbar ist. Empfehlen würde ich vermutlich sogar LibreOffice an der Stelle, weil Word einfach immer nur Stress macht. Aus dem LibreOffice-Ding könnte ich dann ein Word-Dokument erzeugen und aus dem LibreOffice-Ding könnte ich dann auch ein PDF erzeugen. Intern wird, glaube ich, sowieso immer mit Open Office- oder LibreOffice-Tools gearbeitet. Also intern heißt: Wenn die ein Word-Dokument erzeugt, dann werden irgendwelche LibreOffice-Packages benutzt. Egal, Format-Details...

Ich versuche es nochmal zusammen zu fassen:

* Es gibt eine Entität Post und diese Entität Post hat immer einen Seed. Es könnten vielleicht sogar mehrere sein, weiß nicht.
* Es gibt diesen Post pro Post. Für jeden Post wird eine neue Instanz erzeugt. Das ist quasi wie so eine abstrakte Klasse oder so ein Stub oder so.
* Aus diesem Post können dann kundenspezifisch verschiedene Zielformate erzeugt werden. Zielformat müsste man, wir müssen jetzt hier auch die Entities klar benennen, also Format ist noch nicht das richtige Wort. Eine Publikation wäre vielleicht das richtige Wort.
* Eine Publikation kann dann in einen sogenannten Kanal, also Channel, gepostet werden oder auch nicht.
* Ich habe einen Post, eine Publikation und einen Channel.
* Nun könnte man das so sagen, aber vielleicht kann man für Publikation noch ein anderes Wort nehmen. Wenn ich einen Beitrag habe und ich mache daraus ein Rundschreiben, drei Social Media, einen Social Media Post für X, einen für Facebook, wie würde man dann was? Was wäre der richtige Begriff für diese Entitäten, die einzelnen konkreten Posts? Das müssen wir finden.
* Da müssen wir uns über den Betrieb Gedanken machen. Entweder ich mache ein Mandantensystem da draus, was pro Mandant, also was, weiß ich nicht. Ja man dann mäßig läuft das, wäre natürlich fürs Publishing, also fürs Deployment, irgendwie am einfachsten, aber es ist natürlich auch ein bisschen gefährlich, wenn man was kaputt macht. Aber damit muss ich natürlich dann umgehen, wenn ich ein Produkt entwickle, was ich so agil und frei weiterentwickeln kann, wie ich das gerade mit meinem Content Manager mache, also mit dem SmartEditor, kann ich nicht einfach ständig irgendwelche Updates da reinblasen. Dann muss ich mit echten Releases arbeiten.
* Welche Betriebsmodelle gibt es hier? Es ist wichtig, mal zu recherchieren, wie das andere machen es. Es gibt ja nur sechs Millionen Anwendungen, die das andere machen. Ich würde wirklich hingehen und sagen: Das ist eine Sanos-Anwendung, also was gibt es denn für Möglichkeiten? Ich habe da ehrlich gesagt noch nicht so richtig viel Plan von.
* Möglichkeit A: Es gibt eine gemeinsame Datenbank und einen gemeinsamen Container, wo das alles läuft. Eine große Supabase-Datenbank und einen Container. Das gesamte Datenmodell ist vollständig mandantenbasiert, am leichtgewichtigsten im Rollout, am schwergewichtigsten in der Datenbank. Spezielle Challenge ist natürlich die klare mandantenmäßige Absicherung, damit nicht irgendwer die Post von dem anderen verändert oder sehen kann. Das ist ganz doll wichtig. Das heißt, hier hätten wir einen hohen Security-Impact.
* Möglichkeit B: Es gibt eine Applikation und für jeden Kunden eine getrennte Supabase-Datenbank.
* Möglichkeit C: Es gibt für jede Applikation einen vollständigen Stack, der läuft, und das Deployment updatet immer alle gleichzeitig.

Also hier ist die Frage: Wie macht man das? Da brauchen wir ein Betriebsmodell und die ganzen Erweiterungspunkte müssen erst mal definiert werden: die verschiedenen Publikationsformate mit ihren entsprechenden Prompts. Download- und Versandmöglichkeiten sollten wahrscheinlich jeder Kanal bekommen, sodass man eben sagt: Ein Kanal kann auch beim Publishen immer automatisch per E-Mail an irgendjemanden geschickt werden und schickt ihm ein Word-Dokument oder so. Aber ich kann weitere Kanäle definieren, wo ich dann Sachen hinposte. Die werden sukzessive dann entstehen, bei Bedarf. Die muss ich nicht alle jetzt implementieren, aber ich kann vielleicht die wichtigsten schon mal benennen.

Am Schluss muss ich nur noch gucken: Wie arbeite ich mit Login? Im Moment kann man, glaube ich, nur per Google und ich glaube, der andere Editor kann auch per Microsoft 365-Logins machen, aber wir bräuchten dann wahrscheinlich auch so was wie E-Mail, einfach wenn jemand kein OAuth benutzen möchte. Das muss auch noch gebaut werden. 

---
 das hier wäre also der initiale Seed. Hinzugefügt werden muss jetzt noch die komplette Beschreibung des SmartEditors für mich und nochmal die komplette Produktbeschreibung des SmartEditors für den ZDB, sodass wir alle aktuell angedachten Features irgendwie mal zusammen fusionieren auf der Requirements-Ebene
