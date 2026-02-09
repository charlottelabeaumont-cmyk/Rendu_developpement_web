/* Initialisation d'un objet qui sera affiché dans la <div> qui a l'id
map  + Affichage de manière à ce qu'on est une vue globale*/
var map = L.map('map', {
  center: [20, 0],   // Vue monde
  zoom: 2
});

/* La variable osmUrl contient l’adresse vers les tuiles du fond de 
carte */
var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/* La variable osmAttrib contient un texte qui indique la source des données. 
Il apparaîtra en bas à droite de la carte */
var osmAttrib = 'Map data © OpenStreetMap contributors';

/* Création d’un objet TileLayer qui va contenir les tuiles à afficher et ajout à l’objet map.*/
var osm = new L.TileLayer(osmUrl, {
attribution: osmAttrib
}).addTo(map);


/* La variable satelliteUrl contient l'adresse vers les tuiles du fond de carte */
var satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/* La variable satelliteAttrib contient un texte qui indique la source des données. 
Il apparaîtra en bas à droite de la carte */
var satelliteAttrib = '© Esri';

var satellite = new L.TileLayer(satelliteUrl, {
attribution: satelliteAttrib
});

// Création de variables qui vont contenir nos couches //
var Deals;
var Pays;

// Objet contenant les fonds de cartes // 
var Fonds = {
"Fond OSM": osm,
"Fond satellitaire": satellite
};

// objet qui contiendra les couches à afficher dans le menu d'affichage // 
var Couches = {};


// Création du menu des couches vide au départ // 
var menuCouches = L.control.layers(Fonds, Couches, {
collapsed: false
}).addTo(map);


// Chargement du fichier contenant les données// 
fetch('Data/deals.geojson')
.then(response => response.json()) // convertir la réponse en JSON
.then(data => {

  Deals = L.geoJSON(data, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 6,
        fillColor: getImpactColor(feature), // la couleur dépend de l'impact du deal
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 1
      });
    },

    // Ajout de popup clicable sur la couche des deals 
    onEachFeature: function (feature, layer) {
      layer.bindPopup(
        "<b>Pays :</b> " + feature.properties.country +
        "<br><b>Impact environnemental :</b> " + feature.properties.impact_env +
        "<br><b>Impact socio - économique :</b> " + feature.properties.impact_soc +
        "<br><b>Impact culturel :</b> " + feature.properties.impact_cul +
        "<br><b>Déplacement de population :</b> " + feature.properties.impact_dis 
      );
    }
  })//.addTo(map); // Ajout des données à la carte 

  // Ajout de la couche au menu
  menuCouches.addOverlay(Deals, "Deals (impacts)");
});


// Création d'une fonction permettant de modifier la couleur des points en fonction des impacts des deals//
function getImpactColor(feature) {
// On commence avec 0 impacts
var impacts = 0;

// impact environnemental //
if (feature.properties.impact_env == 1) {
  impacts = impacts + 1;
}

// impact socio-economique // 
if (feature.properties.impact_soc == 1) {
  impacts = impacts + 1;
}

// impact culturel // 
if (feature.properties.impact_cul == 1) {
  impacts = impacts + 1;
}

// deplacement de population //
if (feature.properties.impact_dis == 1) {
  impacts = impacts + 1;
}

// Maintenant on choisit la couleur en fonction du nombre d'impacts
if (impacts >= 3) {
  return "#fa0000"; // impacts majeurs
} else if (impacts == 2) {
  return "#fa8e00";
} else if (impacts == 1) {
  return "#fafa00";
} else {
  return "#00fa11"; // peu ou pas d'impacts
}
}


// Chargement d'un deuxième jeu de donées // 
fetch('Data/pays_2.geojson')
.then(response => response.json())
.then(data => {

  Pays = L.geoJSON(data, {
    pointToLayer: function(feature, latlng){

      var v = feature.properties.J_count;

      return L.circleMarker(latlng, {
        radius: getRadius(v),
        fillColor: "blue",
        color: "blue",
        weight: 1,
        opacity: 1,
        fillOpacity: 1
      });
    },

    // Ajout d'un popup // 
    onEachFeature: function (feature, layer) {
      layer.bindPopup(
        "<b>Pays :</b> " + feature.properties.country +
        "<br><b>Nombre de deals :</b> " + feature.properties.J_count
      );
    }
  }).addTo(map);

  // Ajout de la couche au menu
  menuCouches.addOverlay(Pays, "Nombres de deals par pays");
});


// Fonction permettant de calculer des cercles proportionnels en fonction du nombres de deals par pays 
function getRadius(deals) {
return Math.sqrt(deals) * 2; // ajuste le 2 selon ton rendu
}


// Création de la légende //
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<i class="legend_fort_impact"></i> Deals avec des impacts dans tous les domaines<br>';
    div.innerHTML += '<i class="legend_moyen_impact"></i> Deals avec des impacts dans 2 domaines<br>';
    div.innerHTML += '<i class="legend_peu_impact"></i> Deals avec un impact dans 1 domaine<br>';
    div.innerHTML += '<i class="legend_pas_impact"></i> Deals sans impact<br>';
    return div;
};

// ajout de la légende à la carte 
// Affiche la légende quand la chouche est choisi 
map.on('overlayadd', function (e) {
  if (e.name === "Deals (impacts)") {
    legend.addTo(map);
  }
});

//Supprime la légende quand la couche n'es pas choisi
map.on('overlayremove', function (e) {
  if (e.name === "Deals (impacts)") {
    map.removeControl(legend);
  }
});




