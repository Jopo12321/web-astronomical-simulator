import { t } from '../i18n';

export function Guide() {
  return (
    <div className="guide">
      <p>{t('guideLead')}</p>
      <h2>{t('guideButtonsTitle')}</h2>
      <ul>
        <li>
          <strong>{t('solarSystem')}</strong> {t('guideLoadSolar')}
        </li>
        <li>
          <strong>{t('save')}</strong> {t('guideSave')}
        </li>
        <li>
          <strong>{t('load')}</strong> {t('guideLoad')}
        </li>
        <li>
          <strong>{t('csv')}</strong> {t('guideCsv')}
        </li>
        <li>
          <strong>{t('almanac')}</strong> {t('guideAlmanac')}
        </li>
        <li>
          <strong>{t('ics')}</strong> {t('guideIcs')}
        </li>
        <li>
          <strong>{t('share')}</strong> {t('guideShare')}
        </li>
        <li>
          <strong>{t('play')}</strong> {t('guidePlay')}
        </li>
      </ul>
      <h2>{t('guideSetupTitle')}</h2>
      <p>{t('guideSetup')}</p>
      <h2>{t('guideUnitsTitle')}</h2>
      <p>{t('guideUnits')}</p>
      <p>{t('guideDistance')}</p>
      <h2>{t('guideAzgaarTitle')}</h2>
      <p>{t('guideAzgaar')}</p>
      <h2>{t('guideDocsTitle')}</h2>
      <p>{t('guideDocsLead')}</p>
      <ul>
        <li>
          <a href="https://github.com/Jopo12321/web-astronomical-simulator/blob/main/docs/GUIDE.md">
            {t('guideDocsGuide')}
          </a>
        </li>
        <li>
          <a href="https://github.com/Jopo12321/web-astronomical-simulator/blob/main/docs/PHYSICS.md">
            {t('guideDocsPhysics')}
          </a>
        </li>
        <li>
          <a href="https://github.com/Jopo12321/web-astronomical-simulator/blob/main/docs/DATA_SOURCES.md">
            {t('guideDocsSources')}
          </a>
        </li>
        <li>
          <a href="https://github.com/Jopo12321/web-astronomical-simulator">
            {t('guideDocsRepo')}
          </a>
        </li>
      </ul>
    </div>
  );
}
