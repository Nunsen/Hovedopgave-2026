package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.*;
import com.example.hovedopgave.service.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    public List<BookingResponse> getBookings(@RequestParam(required = false) Integer userId) {
        return bookingService.getBookings(userId);
    }

    @GetMapping("/availability")
    public BookingAvailabilityResponse getAvailability(
            @RequestParam String date,
            @RequestParam(required = false) Integer userId
    ) {
        return bookingService.getAvailability(date, userId);
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@RequestBody BookingCreateRequest request) {
        BookingResponse response = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/party-room/availability")
    public PartyRoomAvailabilityResponse getPartyRoomAvailability(
            @RequestParam String month,
            @RequestParam(required = false) Integer userId
    ) {
        return bookingService.getPartyRoomAvailability(month, userId);
    }

    @PostMapping("/party-room")
    public ResponseEntity<BookingResponse> createPartyRoomBooking(@RequestBody PartyRoomBookingRequest request) {
        BookingResponse response = bookingService.createPartyRoomBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Void> deleteBooking(
            @PathVariable Integer bookingId,
            @RequestParam Integer userId
    ) {
        bookingService.deleteBooking(bookingId, userId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(BookingService.BookingValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(
            BookingService.BookingValidationException exception
    ) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
