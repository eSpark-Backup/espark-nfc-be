/**
 * Google Wallet Pass Template for Employee Cards
 * Defines the structure and design of employee passes
 */

/**
 * Create Generic Class definition (one-time setup for all employees)
 * This defines the template/design that all employee passes will use
 */
export const createGenericClassPayload = (companyProfile) => {
  return {
    id: `${process.env.GOOGLE_WALLET_ISSUER_ID}.employee_card_class`,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: "object.textModulesData['designation']",
                    },
                  ],
                },
              },
              endItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: "object.textModulesData['employee_id']",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    imageModulesData: [
      {
        mainImage: {
          sourceUri: {
            uri: companyProfile?.profile_image?.image_url || 'https://via.placeholder.com/400x200',
          },
          contentDescription: {
            defaultValue: {
              language: 'en-US',
              value: 'Company Logo',
            },
          },
        },
      },
    ],
    messages: [
      {
        header: 'Employee Card',
        body: 'Present this card to access company facilities and services.',
        id: 'welcome_message',
      },
    ],
    reviewStatus: 'UNDER_REVIEW',
    heroImage: {
      sourceUri: {
        uri: companyProfile?.profile_image?.image_url || 'https://via.placeholder.com/1032x336',
      },
      contentDescription: {
        defaultValue: {
          language: 'en-US',
          value: 'Company Hero Image',
        },
      },
    },
  };
};

/**
 * Create Generic Object for individual employee
 * This contains the actual employee data
 */
export const createGenericObjectPayload = (employee, companyProfile) => {
  const employeeObjectId = employee._id?.toString();

  if (!employeeObjectId) {
    throw new Error('Employee must be saved before generating Google Wallet object');
  }

  const objectId = `${process.env.GOOGLE_WALLET_ISSUER_ID}.employee_${employeeObjectId}`;

  const classId = `${process.env.GOOGLE_WALLET_ISSUER_ID}.employee_card_class`;

  return {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    ...(employee.profile_image?.image_url
      ? {
          heroImage: {
            sourceUri: {
              uri: employee.profile_image?.image_url,
            },
            contentDescription: {
              defaultValue: {
                language: 'en-US',
                value: `${employee.name} Profile`,
              },
            },
          },
        }
      : {}),

    logo: {
      sourceUri: {
        uri: 'https://www.eurosystemsint.com/images/1769525031563-nfc-logo-without-text.jpg',
      },
      contentDescription: {
        defaultValue: {
          language: 'en-US',
          value: companyProfile?.company_name || 'Company Logo',
        },
      },
    },

    cardTitle: {
      defaultValue: {
        language: 'en-US',
        value: companyProfile?.company_name || 'Company',
      },
    },
    subheader: {
      defaultValue: {
        language: 'en-US',
        value: 'Name',
      },
    },
    header: {
      defaultValue: {
        language: 'en-US',
        value: employee.name,
      },
    },
    textModulesData: [
      { id: 'designation', header: 'Designation', body: employee.designation },
      { id: 'email', header: 'Email', body: employee.email },
      { id: 'phone', header: 'Phone', body: employee.phone_number },
      ...(employee.second_phone_number
        ? [{ id: 'second_phone', header: 'Alternate Phone', body: employee.second_phone_number }]
        : []),
      { id: 'address', header: 'Address', body: employee.address },
    ],

    ...(() => {
      const links = [
        ...(employee.social_links?.linkedin
          ? [
              {
                uri: employee.social_links.linkedin,
                description: 'LinkedIn Profile',
                id: 'linkedin_link',
              },
            ]
          : []),
        ...(employee.social_links?.facebook
          ? [
              {
                uri: employee.social_links.facebook,
                description: 'Facebook Profile',
                id: 'facebook_link',
              },
            ]
          : []),
        ...(employee.social_links?.instagram
          ? [
              {
                uri: employee.social_links.instagram,
                description: 'Instagram Profile',
                id: 'instagram_link',
              },
            ]
          : []),
        ...(employee.social_links?.twitter
          ? [
              {
                uri: employee.social_links.twitter,
                description: 'Twitter Profile',
                id: 'twitter_link',
              },
            ]
          : []),
        ...(employee.social_links?.youtube
          ? [
              {
                uri: employee.social_links.youtube,
                description: 'Youtube Account',
                id: 'youtube_link',
              },
            ]
          : []),
        ...(companyProfile?.website_link
          ? [
              {
                uri: companyProfile.website_link,
                description: 'Company Website',
                id: 'company_website',
              },
            ]
          : []),
      ];

      return links.length ? { linksModuleData: { uris: links } } : {};
    })(),

    barcode: {
      type: 'QR_CODE',
      value: `${process.env.BASE_URL}/api/employees/${employee.employee_id}/contact`,
      alternateText: employee.employee_id,
    },
    hexBackgroundColor: '#ffffff',
  };
};

/**
 * Create JWT claims for Google Wallet save link
 */
export const createJWTClaims = (objectId) => {
  return {
    iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: 'google',
    origins: [process.env.BASE_URL || 'http://localhost:8080'],
    typ: 'savetowallet',
    payload: {
      genericObjects: [
        {
          id: objectId,
        },
      ],
    },
  };
};

/**
 * Helper function to validate employee data before pass creation
 */
export const validateEmployeeData = (employee) => {
  const required = ['name', 'email', 'phone_number', 'designation', 'employee_id'];
  const missing = required.filter((field) => !employee[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required employee fields: ${missing.join(', ')}`);
  }

  return true;
};
