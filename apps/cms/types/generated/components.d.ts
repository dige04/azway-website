import type { Schema, Struct } from '@strapi/strapi';

export interface CruiseOption extends Struct.ComponentSchema {
  collectionName: 'components_cruise_options';
  info: {
    description: 'V\u00E9 du ngo\u1EA1n, thu\u00EA nguy\u00EAn t\u00E0u, \u0103n t\u1ED1i';
    displayName: 'L\u1EF1a ch\u1ECDn du thuy\u1EC1n';
    icon: 'priceTag';
  };
  attributes: {
    description: Schema.Attribute.Text;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    price: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    type: Schema.Attribute.Enumeration<
      ['ve_du_ngoan', 'thue_nguyen_tau', 'an_toi']
    > &
      Schema.Attribute.Required;
  };
}

export interface HomeHeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_home_hero_slides';
  info: {
    description: 'M\u1ED9t \u1EA3nh trong carousel \u0111\u1EA7u trang ch\u1EE7';
    displayName: 'Slide trang ch\u1EE7';
    icon: 'picture';
  };
  attributes: {
    ctaLabel: Schema.Attribute.String;
    ctaUrl: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Ti\u00EAu \u0111\u1EC1, m\u00F4 t\u1EA3 v\u00E0 \u1EA3nh khi chia s\u1EBB';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    noIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedTextItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_text_items';
  info: {
    description: 'M\u1ED9t d\u00F2ng n\u1ED9i dung';
    displayName: 'M\u1EE5c n\u1ED9i dung';
    icon: 'bulletList';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TeambuildingGame extends Struct.ComponentSchema {
  collectionName: 'components_teambuilding_games';
  info: {
    description: 'M\u1ED9t tr\u00F2 ch\u01A1i trong ch\u01B0\u01A1ng tr\u00ECnh';
    displayName: 'Tr\u00F2 ch\u01A1i';
    icon: 'puzzle';
  };
  attributes: {
    howToPlay: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TourCancellationRule extends Struct.ComponentSchema {
  collectionName: 'components_tour_cancellation_rules';
  info: {
    description: 'Ph\u00ED hu\u1EF7 theo s\u1ED1 ng\u00E0y tr\u01B0\u1EDBc kh\u1EDFi h\u00E0nh';
    displayName: '\u0110i\u1EC1u ki\u1EC7n ho\u00E0n hu\u1EF7';
    icon: 'information';
  };
  attributes: {
    daysBefore: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    feePercent: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    note: Schema.Attribute.String;
  };
}

export interface TourItineraryDay extends Struct.ComponentSchema {
  collectionName: 'components_tour_itinerary_days';
  info: {
    description: 'M\u1ED9t ng\u00E0y g\u1ED3m nhi\u1EC1u m\u1ED1c gi\u1EDD';
    displayName: 'Ng\u00E0y l\u1ECBch tr\u00ECnh';
    icon: 'calendar';
  };
  attributes: {
    breakfast: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    dayNumber: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    dinner: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lunch: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    milestones: Schema.Attribute.Component<'tour.milestone', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TourMilestone extends Struct.ComponentSchema {
  collectionName: 'components_tour_milestones';
  info: {
    description: 'M\u1ED9t ho\u1EA1t \u0111\u1ED9ng trong ng\u00E0y';
    displayName: 'M\u1ED1c gi\u1EDD';
    icon: 'clock';
  };
  attributes: {
    description: Schema.Attribute.Text;
    note: Schema.Attribute.String;
    time: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'cruise.option': CruiseOption;
      'home.hero-slide': HomeHeroSlide;
      'shared.seo': SharedSeo;
      'shared.text-item': SharedTextItem;
      'teambuilding.game': TeambuildingGame;
      'tour.cancellation-rule': TourCancellationRule;
      'tour.itinerary-day': TourItineraryDay;
      'tour.milestone': TourMilestone;
    }
  }
}
