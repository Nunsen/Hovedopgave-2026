package com.example.hovedopgave.controller;

import com.example.hovedopgave.model.Faq;
import com.example.hovedopgave.repository.FaqRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/faqs")
public class FaqController {

    private final FaqRepository faqRepository;

    public FaqController(FaqRepository faqRepository) {
        this.faqRepository = faqRepository;
    }

    @GetMapping
    public List<Faq> getFaqs() {
        return faqRepository.findAll();
    }
}
