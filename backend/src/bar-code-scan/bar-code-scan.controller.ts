import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { BarCodeScanService } from './bar-code-scan.service';

@Controller('barcode')
export class BarCodeScanController {
  constructor(private readonly barcodeService: BarCodeScanService) {}

  @Post()
  async create(@Body() req: { barcode: any; userId: string }) {
    const barcodeData = await this.barcodeService.getData(
      req.barcode,
      req.userId,
    );
    return { data: barcodeData, message: 'Bar Code Data fetched successfully' };
  }
}
