import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { UserDetailsService } from 'src/user-detail/user-detail.service';

@Injectable()
export class BarCodeScanService {
  constructor(
    private readonly userDetailsService: UserDetailsService,

    private readonly httpService: HttpService,
  ) {}

  async getData(barcode: string, userId?: string) {
    console.log(barcode);
    const res = await this.getBarCodeData(barcode, userId);
    return res;
  }

  async getBarCodeData(barcode: string, userId?: string): Promise<any> {
    barcode = '8906013030015';
    const url = `https://world.openfoodfacts.net/api/v2/product/${barcode}`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      if (!response) {
        throw new Error();
      }
      let userAllergens = [];
      let isSafeForUser = true;
      if (userId) {
        const UserDetails = await this.userDetailsService.findOne(userId);
        userAllergens = UserDetails?.allergens;
      }

      const {
        ingredients_text_with_allergens_fr,
        nutriments,
        nutrition_data_per,
        product_name,
      } = response.data.product;

      const nutrientPercentages =
        nutriments && this.calculateNutrientPercentages(nutriments);
      const ingredientData =
        ingredients_text_with_allergens_fr &&
        this.processIngredientData(ingredients_text_with_allergens_fr);

      ingredientData?.allergens?.forEach((prediction) => {
        if (userAllergens?.includes(prediction)) {
          isSafeForUser = false;
        }
      });
      return {
        productName: product_name,
        ingredientData: ingredientData,
        nutrientPercentages: nutrientPercentages,
        nutritionDataPerGm: nutrition_data_per,
        isSafeForUser,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  private calculateNutrientPercentages(
    nutriments: any,
  ): Record<string, number> {
    const percentages: Record<string, number> = {};

    const totalNutrients =
      (nutriments.carbohydrates || 0) +
      (nutriments.proteins || 0) +
      (nutriments.fat || 0) +
      (nutriments.fiber || 0) +
      (nutriments.sugars || 0) +
      (nutriments.saturated_fat || 0);

    for (const [key, value] of Object.entries(nutriments)) {
      if (key.includes('_100g')) {
        percentages[key] = parseFloat(
          ((Number(value) / totalNutrients) * 100).toFixed(2),
        );
      }
    }

    return percentages;
  }

  private processIngredientData(input: string) {
    if (!input) return;
    const cleanedData =
      input &&
      input
        ?.replace(/<span class="allergen">/g, '')
        ?.replace(/<\/span>/g, '')
        ?.replace(/\s+/g, ' ')
        ?.trim();

    const ingredientsPart = cleanedData?.split(':')[1]?.trim();
    const ingredientsArray = ingredientsPart
      ?.split(',')
      ?.map((ingredient) => ingredient.trim());

    const allergenMatches = [
      ...input?.matchAll(/<span class="allergen">(.*?)<\/span>/g),
    ];
    const allergens = allergenMatches?.map((match) => match[1]?.trim());

    const formattedData = {
      ingredients: ingredientsArray,
      allergens: [...new Set(allergens)],
    };

    return formattedData;
  }
}
