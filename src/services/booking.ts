import { task, workflow } from '@progress/observability';

export interface BookingConfirmation {
  reservationId: string;
  hotelId: string;
  status: 'CONFIRMED' | 'FAILED';
}

export class BookingService {
  @workflow({ name: 'hotel-booking-flow' })
  async bookHotel(userId: string, hotelId: string): Promise<BookingConfirmation> {
    await this.verifyAvailability(hotelId);
    await this.processPayment(userId);
    return await this.confirmReservation(hotelId);
  }

  @task({ tags: ['db-query'] })
  private async verifyAvailability(hotelId: string): Promise<boolean> {
    // Simulated DB query for room inventory
    return Boolean(hotelId);
  }

  @task()
  private async processPayment(userId: string): Promise<boolean> {
    // Simulated payment processing gateway
    return Boolean(userId);
  }

  @task()
  private async confirmReservation(hotelId: string): Promise<BookingConfirmation> {
    // Simulated reservation confirmation
    return {
      reservationId: `RES-${Date.now()}`,
      hotelId,
      status: 'CONFIRMED',
    };
  }
}
