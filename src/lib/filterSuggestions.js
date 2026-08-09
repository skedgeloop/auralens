/**
 * Suggest edit suggestions based on detected objects (COCO-SSD format).
 */

export const suggestEdits = (detectedObjects) => {
  const suggestions = [];

  if (!detectedObjects || detectedObjects.length === 0) {
    suggestions.push({
      text: 'Consider adding a warm filter to enhance the mood',
      filter: 'vintage',
      reason: 'No specific objects detected; general enhancement suggested',
    });
    return suggestions;
  }

  // Detect specific object types from COCO-SSD classes
  const labels = detectedObjects.map((obj) => obj.class || obj.label);

  const hasFaces = labels.includes('person');
  const hasPeople = labels.includes('person');
  const hasAnimal = labels.some((l) => ['cat', 'dog', 'horse', 'bird', 'bear'].includes(l));
  const hasTransport = labels.some((l) =>
    ['car', 'bicycle', 'motorcycle', 'boat', 'train', 'airplane', 'bus', 'truck'].includes(l)
  );
  const hasFood = labels.some((l) => ['dining table', 'bottle', 'cup', 'fork', 'knife', 'bowl'].includes(l));
  const hasNature = labels.some((l) => ['potted plant', 'tree', 'flower'].includes(l));

  // Add specific suggestions based on object detection
  if (hasPeople && hasFaces) {
    suggestions.push({
      text: 'Consider enhancing facial features for a sharper look',
      filter: 'highContrast',
      reason: 'Faces detected - could improve clarity',
    });
  }

  if (hasTransport) {
    suggestions.push({
      text: 'Apply blur to create a dreamy, artistic background effect',
      filter: 'blur',
      reason: 'Transport found - dreamy effect',
    });
  }

  if (hasAnimal) {
    suggestions.push({
      text: 'Apply a vintage filter to add a nostalgic feel',
      filter: 'vintage',
      reason: 'Animal detected - warm vintage tone',
    });
  }

  if (hasFood) {
    suggestions.push({
      text: 'Try a warm tone filter for a cozy, appetizing look',
      filter: 'warm',
      reason: 'Food objects detected - warm tone',
    });
  }

  if (hasNature) {
    suggestions.push({
      text: 'Sepia effect to give a historical, vintage feel',
      filter: 'sepia',
      reason: 'Nature objects detected - sepia tone',
    });
  }

  // Add some general suggestions
  suggestions.push({
    text: 'Apply a subtle brightness boost for a lighter feel',
    filter: 'brightness',
    reason: 'General enhancement',
  });

  return suggestions.slice(0, 5); // Limit to 5 suggestions
};

export default {
  suggestEdits,
};
