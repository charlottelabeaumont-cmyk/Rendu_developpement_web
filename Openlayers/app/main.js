// Import des librairies nécessaires
import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { ImageWMS } from 'ol/source';
import ImageLayer from 'ol/layer/Image';
import ScaleLine from 'ol/control/ScaleLine';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON.js';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import Zoom from 'ol/control/Zoom';
import { Circle, Fill, Stroke, Style } from 'ol/style.js';
import FullScreen from 'ol/control/FullScreen';

/////////////////////////////////////////////////////////////////
// Couches de fond de carte
const coucheOsm = new TileLayer({ 
  source: new OSM({
    attributions: [
      '© OpenStreetMap contributors --- Land Matrix, 2026'
    ]
  })
});

const FondRelief = new TileLayer({
  source: new XYZ({
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
  }),
  visible: false
});

// Lien vers le Geoserver (une variable)
const urlGeoserver = 'http://localhost:8080/geoserver/land_matrix_agri/';

/////////////////////////////////////////////////////////////////
// Couches WMS/WFS des deals et des cercles proportionnels 
// Deals agriculture - WMS
const sourceDealsAgri = new ImageWMS({
  url: urlGeoserver + 'wms',
  params: { LAYERS: 'land_matrix_agri:deals' }
});

const dealsAgri = new ImageLayer({
  source: sourceDealsAgri
});


// Centroid Boundaries - WFS
const sourceCentrBoundaries = new VectorSource({
  format: new GeoJSON(),
  url: urlGeoserver + 
       'ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' +
       'land_matrix_agri%3Acentroid_Boundaries&maxFeatures=300&outputFormat=application%2Fjson'
});

// Style pour Centroid Boundaries (obligatoire de le faire ici car c'est une couche WFS, le style de geoserver n'est pas actif ici)
function styleCentrBoundaries(feature) {
  const nbDeals = feature.get('surface_ha_sum');
  const rayonCentr = Math.sqrt(nbDeals) * 0.04;
  return new Style({
    image: new Circle({
      radius: rayonCentr,
      fill: new Fill({ color: 'rgba(39, 174, 96, 0.6)' }),
      stroke: new Stroke({ color: 'rgba(20, 90, 50, 0.8)', width: 1.2 })
    })
  });
}

const CentrBoundaries = new VectorLayer({
  source: sourceCentrBoundaries,
  style: styleCentrBoundaries,
  visible: false
});

/////////////////////////////////////////////////////////////////
// Création de la carte
const map = new Map({
  target: 'map',
  layers: [coucheOsm, FondRelief, dealsAgri, CentrBoundaries],
  view: new View({
    center: fromLonLat([0, 0]),
    zoom: 2
  }),
  controls: [new Zoom()]
});

//Ajouter la possibilité de mettre en plein écran 
map.addControl(new FullScreen());

// Ajout de l'échelle
const scaleLineControl = new ScaleLine({ units: 'metric', bar: false, text: true });
map.addControl(scaleLineControl);

/////////////////////////////////////////////////////////////////
// Interactivité - cochage/décochage des couches

// Deals agriculture
const checkboxDeals = document.getElementById('checkbox-deals');
checkboxDeals.addEventListener('change', (event) => {
  dealsAgri.setVisible(event.currentTarget.checked);
});

// Centroid Boundaries
const checkboxBoundaries = document.getElementById('checkbox-centro');
checkboxBoundaries.addEventListener('change', (event) => {
  CentrBoundaries.setVisible(event.currentTarget.checked);
});

// Fond de carte OSM
const boutonOSM = document.getElementById('bouton-OSM');
boutonOSM.addEventListener('change', (event) => {
  coucheOsm.setVisible(event.currentTarget.checked);
  FondRelief.setVisible(!event.currentTarget.checked);
});

// Fond de carte relief
const boutonRelief = document.getElementById('bouton-relief');
boutonRelief.addEventListener('change', (event) => {
  FondRelief.setVisible(event.currentTarget.checked);
  coucheOsm.setVisible(!event.currentTarget.checked);
});

/////////////////////////////////////////////////////////////////
// Filtres sur deals agriculture
// Impacts environnementaux
const checkboxEnv = document.getElementById('checkbox-env');
checkboxEnv.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': 'impact_environmental_degradation=true' });
});

// Déplacements
const checkboxDis = document.getElementById('checkbox-dis');
checkboxDis.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': 'impact_displacement=true' });
});

// Violences
const checkboxVio = document.getElementById('checkbox-vio');
checkboxVio.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': 'impact_violence=true' });
});

// Retour à toutes les consultations
const checkboxAll = document.getElementById('checkbox-all');
checkboxAll.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': '' });
});

// Consultation des populations (pas consultées ou consultation limitée)
const checkboxNotconsu = document.getElementById('checkbox-notconsu');
checkboxNotconsu.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': "community_consultation IN('Not consulted', 'Limited consultation')" });
});

// Consultation des populations (consultées)
const checkboxConsu = document.getElementById('checkbox-consu');
checkboxConsu.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': "community_consultation='Free, Prior and Informed Consent (FPIC)'" });
});

// Consultation des populations (non renseignée)
const checkboxNull = document.getElementById('checkbox-null');
checkboxNull.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER':"community_consultation IS NULL" });
});

// Retour à toutes les consultations
const checkboxAllCon = document.getElementById('checkbox-all-con');
checkboxAllCon.addEventListener('change', () => {
  sourceDealsAgri.updateParams({ 'CQL_FILTER': '' });
});

/////////////////////////////////////////////////////////////////
// Apparition de la table attributaire au clic

map.on('singleclick', async (event) => {
  const table = document.getElementById('table');
  table.style.display = 'block';

  const url = sourceDealsAgri.getFeatureInfoUrl(
    event.coordinate,
    map.getView().getResolution(),
    'EPSG:3857',
    { INFO_FORMAT: 'application/json' }
  );
  const data = await (await fetch(url)).json();

  if (!data.features || data.features.length === 0) {
    table.textContent = 'Aucune transaction sélectionnée';
    return;
  }
  const p = data.features[0].properties;

  table.innerHTML = `
    <strong>Informations principales sur <br> la transaction sélectionnée :</strong><br>
    Pays : ${p.country}<br>
    Surface : ${p.surface_ha} ha<br>
    Cultures : ${p.crops}
  `; /* permet un joli rendu de la table attributaire qui reste discrète */ 
});


/* A faire 
SOIT deux pages web, une pour Leaflet et une pour OpenLayers (option recommandée), SOIT une page web qui contient à la fois une carte OpenLayers et une carte Leaflet (peu recommandé, sauf si vous savez ce que vous faites).
Le code final build (npm run build) et visible sur le serveur de production localhost:80.
Le code mis en ligne sur un projet GitHub (on ne demande pas de branch, etc. mais juste d’avoir le code final sur GitHub)
Voir avec silya l'avancement */ 
