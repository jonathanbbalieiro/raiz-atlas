# RAIZ v1.3.1 — Fotos, enquadramento e biodiversidade visual

## Objetivo
Melhorar a apresentação das fotografias da base preferida, aproveitar melhor o acervo já documentado e ampliar o suporte a licenças livres do Wikimedia Commons.

## O que mudou

### 1. Enquadramento e seleção
- Nova heurística para escolher automaticamente as melhores fotos do parque (`src/lib/photos.ts`).
- Reordenação das galerias por qualidade/resolução e proporção mais adequada.
- Ajuste de enquadramento em capas, galerias, Expedições, Mundo Perdido, comparativos e vitrines de flora/fauna.

### 2. Mais fotos visíveis no site
- Nova seção `Fotos de seres do parque` com mistura de fauna e flora já documentadas no levantamento científico.
- Vitrine de flora ampliada de 6 para 8 cartões na visualização inicial.
- Continuidade das fotos e créditos em cada espécie.

### 3. Licenças livres ampliadas
- Classificação de licenças do Commons tornou-se mais ampla, aceitando com revisão editorial licenças como GFDL e combinações livres.
- Scripts `auto-wonder-photos` e `fill-flagship-photos` passaram a usar a mesma política centralizada.

## Limitações
- Não foi possível baixar novas imagens da internet neste ambiente.
- Assim, esta versão melhora fortemente a apresentação, o aproveitamento do acervo local e o pipeline de futuras buscas, mas não promete ter preenchido todas as lacunas visuais por parque.
