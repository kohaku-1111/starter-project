import React from 'react';

interface CaseStudy {
  logo: string;
  quote: string;
  resultMetric: string;
}

const caseStudies: CaseStudy[] = [
  {
    logo: '/images/case1-logo.png',
    quote: 'Using our training platform dramatically improved workflow efficiency.',
    resultMetric: 'Efficiency +40%',
  },
  {
    logo: '/images/case2-logo.png',
    quote: 'The model accuracy exceeded expectations after adopting our solution.',
    resultMetric: 'Model accuracy 95%',
  },
];

const CaseCard: React.FC<CaseStudy> = ({ logo, quote, resultMetric }) => (
  <div className="case-card">
    <img src={logo} alt="Case study logo" className="case-card__logo" />
    <blockquote className="case-card__quote">{quote}</blockquote>
    <p className="case-card__result">{resultMetric}</p>
  </div>
);

const CaseStudySection: React.FC = () => (
  <section className="case-study-section">
    {caseStudies.map((c, i) => (
      <CaseCard key={i} {...c} />
    ))}
  </section>
);

export default CaseStudySection;
