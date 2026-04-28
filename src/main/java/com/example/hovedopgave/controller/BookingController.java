package com.example.hovedopgave.controller;

import com.example.hovedopgave.model.Booking;
import com.example.hovedopgave.repository.BookingRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingRepository bookingRepository;

    public BookingController(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @GetMapping
    public List<Booking> getBookings(@RequestParam(required = false) Integer userId) {
        if (userId != null) {
            return bookingRepository.findByUserUserId(userId);
        }
        return bookingRepository.findAll();
    }
}
